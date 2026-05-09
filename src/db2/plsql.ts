import { tab } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode } from '../compiler/types.js';
import { toDb2Type } from './types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fkDb2Type(ctx: DdlContext, refName: string): string {
    const refNode = ctx.find(refName);
    if (refNode == null) return 'integer';
    const pkName = refNode.getExplicitPkName();
    if (pkName == null || pkName.includes(',')) return 'integer';
    const pkChild = refNode.findChild(pkName);
    return pkChild != null ? toDb2Type(pkChild._inferTypeFull()) : 'integer';
}

/**
 * Handles Db2 BEFORE INSERT/UPDATE trigger generation and schema-based
 * layered TAPI (SQL PL stored procedures, one schema per tier).
 */
export class Db2PlsqlBuilder {
    constructor(
        private ctx:    DdlContext,
        private naming: Naming,
    ) {}

    // ── Triggers ──────────────────────────────────────────────────────────────

    generateTrigger(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        return this._generateBITrigger(node) + this._generateBUTrigger(node);
    }

    private _generateBITrigger(node: IDdlNode): string {
        const hasRowVersion = node.hasRowVersion();
        const hasAuditCols  = node.hasAuditCols();
        const hasCaseCol    = node.children.some(c => c.isOption('lower') || c.isOption('upper'));
        if (!hasRowVersion && !hasAuditCols && !hasCaseCol) return '';

        const objName = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        let ret = `--#SET TERMINATOR @\n`;
        ret += `create or replace trigger ${objName}${this.naming.bi}\n`;
        ret += `before insert on ${objName}\n`;
        ret += `referencing new as n\n`;
        ret += `for each row\n`;
        ret += `begin\n`;

        for (const child of node.children) {
            if (child.isOption('lower'))
                ret += `    set n.${child.parseName()} = lower(n.${child.parseName()});\n`;
            else if (child.isOption('upper'))
                ret += `    set n.${child.parseName()} = upper(n.${child.parseName()});\n`;
        }
        if (hasRowVersion) ret += `    set n.row_version = 1;\n`;
        if (hasAuditCols) {
            ret += `    set n.${this.ctx.getOptionValue('createdcol')}   = current timestamp;\n`;
            ret += `    set n.${this.ctx.getOptionValue('createdbycol')} = current user;\n`;
            ret += `    set n.${this.ctx.getOptionValue('updatedcol')}   = current timestamp;\n`;
            ret += `    set n.${this.ctx.getOptionValue('updatedbycol')} = current user;\n`;
        }
        ret += `end @\n--#SET TERMINATOR ;\n`;
        return ret;
    }

    private _generateBUTrigger(node: IDdlNode): string {
        const hasRowVersion = node.hasRowVersion();
        const hasAuditCols  = node.hasAuditCols();
        const hasCaseCol    = node.children.some(c => c.isOption('lower') || c.isOption('upper'));
        if (!hasRowVersion && !hasAuditCols && !hasCaseCol) return '';

        const objName = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        let ret = `--#SET TERMINATOR @\n`;
        ret += `create or replace trigger ${objName}${this.naming.bu}\n`;
        ret += `before update on ${objName}\n`;
        ret += `referencing new as n old as o\n`;
        ret += `for each row\n`;
        ret += `begin\n`;

        for (const child of node.children) {
            if (child.isOption('lower'))
                ret += `    set n.${child.parseName()} = lower(n.${child.parseName()});\n`;
            else if (child.isOption('upper'))
                ret += `    set n.${child.parseName()} = upper(n.${child.parseName()});\n`;
        }
        if (hasRowVersion)
            ret += `    set n.row_version = coalesce(o.row_version, 0) + 1;\n`;
        if (hasAuditCols) {
            ret += `    set n.${this.ctx.getOptionValue('updatedcol')}   = current timestamp;\n`;
            ret += `    set n.${this.ctx.getOptionValue('updatedbycol')} = current user;\n`;
        }
        ret += `end @\n--#SET TERMINATOR ;\n`;
        return ret;
    }

    // ── Layered TAPI ──────────────────────────────────────────────────────────

    private _getTier(node: IDdlNode): string {
        const apiArg = node.getOptionValue('api');
        const raw    = apiArg == null || String(apiArg).trim() === '' ? 'full+hks'
                     : String(apiArg).trim().toLowerCase();
        switch (raw) {
            case 'layered': case '3h': return 'full+hks';
            case '3':                  return 'full';
            case '2h':                 return 'service+hks';
            case '2':                  return 'service';
            case '1h':                 return 'lookup+hks';
            case '1':                  return 'lookup';
            default:                   return raw;
        }
    }

    private _svcCols(node: IDdlNode): IDdlNode[] {
        return node.children.filter(
            c => c.children.length === 0 &&
                 c.refId() === null &&
                 c.parseName().toLowerCase() !== 'row_version'
        );
    }

    generateLayeredTAPI(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        node.lateInitFks();

        const tier   = this._getTier(node);
        const hasDal = ['full', 'full+hks'].includes(tier);
        const hasHks = tier.endsWith('+hks');
        const hasSvc = ['service', 'service+hks', 'full', 'full+hks'].includes(tier);
        const ifc    = String(this.ctx.getOptionValue('ifc') ?? 'rest').toLowerCase();
        const genRst = ifc === 'rest' || ifc === 'both' || ifc === '' || ifc === 'apex';

        const tbl    = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const pkNm   = (node.getPkName() ?? 'id').toLowerCase();
        const pkType = 'integer';

        let out = `--#SET TERMINATOR @\n`;
        out += `-- TAPI: ${tbl}  tier=${tier}\n\n`;

        // ── DAL ──
        if (hasDal) {
            out += `create schema ${tbl}_dal @\n\n`;
            out += this._generateDal(node, tbl, pkNm, pkType);
        }

        // ── HKS ──
        if (hasHks) {
            out += `create schema ${tbl}_hks @\n\n`;
            out += this._generateHks(node, tbl, pkNm, pkType, hasDal);
        }

        // ── SVC ──
        if (hasSvc) {
            out += `create schema ${tbl}_svc @\n\n`;
            out += this._generateSvc(node, tbl, pkNm, pkType, hasDal, hasHks);
        }

        // ── RST ──
        if (genRst) {
            out += `create schema ${tbl}_rst @\n\n`;
            out += this._generateRst(node, tbl, pkNm, pkType, hasSvc, hasDal, hasHks);
        }

        out += `--#SET TERMINATOR ;\n`;
        return out;
    }

    // ── DAL procedures ────────────────────────────────────────────────────────

    private _generateDal(node: IDdlNode, tbl: string, pkNm: string, pkType: string): string {
        const fkCols  = Object.keys(node.fks ?? {});
        const svcCols = this._svcCols(node);
        let out = '';

        // p_get_by_id — returns result set via cursor
        out += `create or replace procedure ${tbl}_dal.p_get_by_id (\n`;
        out += `    in p_${pkNm} ${pkType}\n`;
        out += `)\nlanguage sql\ndynamic result sets 1\nbegin\n`;
        out += `    declare c cursor with return for\n`;
        out += `        select * from ${tbl} where ${pkNm} = p_${pkNm};\n`;
        out += `    open c;\n`;
        out += `end @\n\n`;

        // p_insert_row
        out += `create or replace procedure ${tbl}_dal.p_insert_row (\n`;
        for (const fk of fkCols)
            out += `    in  p_${fk} ${fkDb2Type(this.ctx, node.fks![fk])},\n`;
        for (const child of svcCols)
            out += `    in  p_${child.parseName()} ${toDb2Type(child._inferTypeFull())},\n`;
        out += `    out p_${pkNm} ${pkType}\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    insert into ${tbl} (\n`;
        for (const fk of fkCols) out += `        ${fk},\n`;
        for (const child of svcCols) out += `        ${child.parseName()},\n`;
        // trim trailing comma — last column line has trailing comma that we remove
        out = out.replace(/,\n$/, '\n');
        out += `    ) values (\n`;
        for (const fk of fkCols) out += `        p_${fk},\n`;
        for (const child of svcCols) out += `        p_${child.parseName()},\n`;
        out = out.replace(/,\n$/, '\n');
        out += `    );\n`;
        out += `    set p_${pkNm} = identity_val_local();\n`;
        out += `end @\n\n`;

        // p_update_row
        out += `create or replace procedure ${tbl}_dal.p_update_row (\n`;
        out += `    in p_${pkNm} ${pkType},\n`;
        for (const fk of fkCols) out += `    in p_${fk} ${fkDb2Type(this.ctx, node.fks![fk])},\n`;
        for (const child of svcCols) out += `    in p_${child.parseName()} ${toDb2Type(child._inferTypeFull())},\n`;
        out = out.replace(/,\n$/, '\n');
        out += `)\nlanguage sql\nbegin\n`;
        out += `    update ${tbl} set\n`;
        for (const fk of fkCols) out += `        ${fk} = p_${fk},\n`;
        for (const child of svcCols) out += `        ${child.parseName()} = p_${child.parseName()},\n`;
        out = out.replace(/,\n$/, '\n');
        out += `    where ${pkNm} = p_${pkNm};\n`;
        out += `end @\n\n`;

        // p_delete_row
        out += `create or replace procedure ${tbl}_dal.p_delete_row (\n`;
        out += `    in p_${pkNm} ${pkType}\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    delete from ${tbl} where ${pkNm} = p_${pkNm};\n`;
        out += `end @\n\n`;

        return out;
    }

    // ── HKS stubs ─────────────────────────────────────────────────────────────

    private _generateHks(node: IDdlNode, tbl: string, pkNm: string, pkType: string, hasDal: boolean): string {
        const idType = hasDal ? `${tbl}_dal.t_id` : pkType;
        let out = '';

        out += `create or replace procedure ${tbl}_hks.p_validate (\n`;
        out += `    in p_action varchar(10),\n`;
        out += `    in p_row    varchar(32000)\n`;
        out += `)\nlanguage sql\nbegin\n    -- stub: add validation logic\n    return;\nend @\n\n`;

        for (const hook of ['p_before_insert', 'p_after_insert', 'p_before_update', 'p_after_update']) {
            out += `create or replace procedure ${tbl}_hks.${hook} (\n`;
            out += `    in p_row varchar(32000)\n`;
            out += `)\nlanguage sql\nbegin\n    -- stub\n    return;\nend @\n\n`;
        }

        out += `create or replace procedure ${tbl}_hks.p_before_delete (\n`;
        out += `    in p_${pkNm} ${idType}\n`;
        out += `)\nlanguage sql\nbegin\n    -- stub\n    return;\nend @\n\n`;

        out += `create or replace procedure ${tbl}_hks.p_after_delete (\n`;
        out += `    in p_${pkNm} ${idType}\n`;
        out += `)\nlanguage sql\nbegin\n    -- stub\n    return;\nend @\n\n`;

        return out;
    }

    // ── SVC facade ────────────────────────────────────────────────────────────

    private _generateSvc(
        node: IDdlNode, tbl: string, pkNm: string, pkType: string,
        hasDal: boolean, hasHks: boolean,
    ): string {
        const fkCols  = Object.keys(node.fks ?? {});
        const svcCols = this._svcCols(node);
        let out = '';

        // SVC.get
        out += `create or replace procedure ${tbl}_svc.get (\n`;
        out += `    in  p_${pkNm} ${pkType},\n`;
        out += `    out p_result  varchar(32000)\n`;
        out += `)\nlanguage sql\ndynamic result sets 1\nbegin\n`;
        if (hasDal)
            out += `    call ${tbl}_dal.p_get_by_id(p_${pkNm});\n`;
        else {
            out += `    -- private get (absorbed from absent _dal)\n`;
            out += `    declare c cursor with return for\n`;
            out += `        select * from ${tbl} where ${pkNm} = p_${pkNm};\n`;
            out += `    open c;\n`;
        }
        out += `end @\n\n`;

        // SVC.ins
        out += `create or replace procedure ${tbl}_svc.ins (\n`;
        for (const fk of fkCols) out += `    in  p_${fk} ${fkDb2Type(this.ctx, node.fks![fk])},\n`;
        for (const child of svcCols) out += `    in  p_${child.parseName()} ${toDb2Type(child._inferTypeFull())},\n`;
        out += `    out p_${pkNm} ${pkType},\n`;
        out += `    out p_status  varchar(20)\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare exit handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        set p_status = 'ERROR';\n`;
        out += `    end;\n`;
        if (hasHks) out += `    call ${tbl}_hks.p_validate('INSERT', '');\n`;
        if (hasHks) out += `    call ${tbl}_hks.p_before_insert('');\n`;
        if (hasDal) {
            out += `    call ${tbl}_dal.p_insert_row(`;
            const allCols = [...fkCols.map(fk => `p_${fk}`), ...svcCols.map(c => `p_${c.parseName()}`), `p_${pkNm}`];
            out += allCols.join(', ') + `);\n`;
        } else {
            out += `    -- private insert (absorbed from absent _dal)\n`;
            out += `    insert into ${tbl} (`;
            const cols = [...fkCols, ...svcCols.map(c => c.parseName())];
            out += cols.join(', ') + `) values (`;
            out += cols.map(c => `p_${c}`).join(', ') + `);\n`;
            out += `    set p_${pkNm} = identity_val_local();\n`;
        }
        if (hasHks) out += `    call ${tbl}_hks.p_after_insert('');\n`;
        out += `    set p_status = 'SUCCESS';\n`;
        out += `end @\n\n`;

        // SVC.upd
        out += `create or replace procedure ${tbl}_svc.upd (\n`;
        out += `    in  p_${pkNm} ${pkType},\n`;
        for (const fk of fkCols) out += `    in  p_${fk} ${fkDb2Type(this.ctx, node.fks![fk])},\n`;
        for (const child of svcCols) out += `    in  p_${child.parseName()} ${toDb2Type(child._inferTypeFull())},\n`;
        out += `    out p_status  varchar(20)\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare exit handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        set p_status = 'ERROR';\n`;
        out += `    end;\n`;
        if (hasHks) out += `    call ${tbl}_hks.p_validate('UPDATE', '');\n`;
        if (hasHks) out += `    call ${tbl}_hks.p_before_update('');\n`;
        if (hasDal) {
            out += `    call ${tbl}_dal.p_update_row(p_${pkNm}`;
            for (const fk of fkCols) out += `, p_${fk}`;
            for (const child of svcCols) out += `, p_${child.parseName()}`;
            out += `);\n`;
        } else {
            out += `    -- private update (absorbed from absent _dal)\n`;
            out += `    update ${tbl} set\n`;
            const setCols = [...fkCols.map(fk => `        ${fk} = p_${fk}`), ...svcCols.map(c => `        ${c.parseName()} = p_${c.parseName()}`)];
            out += setCols.join(',\n') + `\n    where ${pkNm} = p_${pkNm};\n`;
        }
        if (hasHks) out += `    call ${tbl}_hks.p_after_update('');\n`;
        out += `    set p_status = 'SUCCESS';\n`;
        out += `end @\n\n`;

        // SVC.del
        out += `create or replace procedure ${tbl}_svc.del (\n`;
        out += `    in  p_${pkNm} ${pkType},\n`;
        out += `    out p_status  varchar(20)\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare exit handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        set p_status = 'ERROR';\n`;
        out += `    end;\n`;
        if (hasHks) out += `    call ${tbl}_hks.p_before_delete(p_${pkNm});\n`;
        if (hasDal)
            out += `    call ${tbl}_dal.p_delete_row(p_${pkNm});\n`;
        else {
            out += `    -- private delete (absorbed from absent _dal)\n`;
            out += `    delete from ${tbl} where ${pkNm} = p_${pkNm};\n`;
        }
        if (hasHks) out += `    call ${tbl}_hks.p_after_delete(p_${pkNm});\n`;
        out += `    set p_status = 'SUCCESS';\n`;
        out += `end @\n\n`;

        return out;
    }

    // ── RST interface ─────────────────────────────────────────────────────────

    private _generateRst(
        node: IDdlNode, tbl: string, pkNm: string, pkType: string,
        hasSvc: boolean, hasDal: boolean, hasHks: boolean,
    ): string {
        const fkCols  = Object.keys(node.fks ?? {});
        const svcCols = this._svcCols(node);
        let out = '';

        // RST.get
        out += `create or replace procedure ${tbl}_rst.get (\n`;
        out += `    in  p_${pkNm} ${pkType},\n`;
        out += `    out p_result  varchar(32000),\n`;
        out += `    out p_status  integer\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare continue handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        get diagnostics exception 1 p_result = message_text;\n`;
        out += `        set p_result = json_object('error': p_result);\n`;
        out += `        set p_status = 500;\n`;
        out += `    end;\n`;
        out += `    set p_status = 200;\n`;
        if (hasSvc)
            out += `    call ${tbl}_svc.get(p_${pkNm}, p_result);\n`;
        else if (hasDal)
            out += `    call ${tbl}_dal.p_get_by_id(p_${pkNm});\n`;
        else {
            out += `    -- private get (absorbed from absent _svc/_dal)\n`;
            out += `    select json_object(`;
            const cols = svcCols.map(c => `'${c.parseName()}': ${c.parseName()}`);
            if (cols.length > 0) out += cols.join(', ');
            out += `)\n    into p_result from ${tbl} where ${pkNm} = p_${pkNm};\n`;
        }
        out += `end @\n\n`;

        // RST.ins
        out += `create or replace procedure ${tbl}_rst.ins (\n`;
        for (const fk of fkCols) out += `    in  p_${fk} ${fkDb2Type(this.ctx, node.fks![fk])},\n`;
        for (const child of svcCols) out += `    in  p_${child.parseName()} ${toDb2Type(child._inferTypeFull())},\n`;
        out += `    out p_${pkNm}  ${pkType},\n`;
        out += `    out p_result   varchar(32000),\n`;
        out += `    out p_status   integer\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare p_svc_status varchar(20);\n`;
        out += `    declare continue handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        get diagnostics exception 1 p_result = message_text;\n`;
        out += `        set p_result = json_object('error': p_result);\n`;
        out += `        set p_status = 500;\n`;
        out += `    end;\n`;
        out += `    set p_status = 201;\n`;
        if (hasSvc) {
            out += `    call ${tbl}_svc.ins(`;
            const args = [...fkCols.map(fk => `p_${fk}`), ...svcCols.map(c => `p_${c.parseName()}`), `p_${pkNm}`, 'p_svc_status'];
            out += args.join(', ') + `);\n`;
        } else {
            out += `    -- private insert (absorbed from absent _svc/_dal)\n`;
            if (hasHks) out += `    call ${tbl}_hks.p_validate('INSERT', '');\n`;
            out += `    insert into ${tbl} (`;
            const cols = [...fkCols, ...svcCols.map(c => c.parseName())];
            out += cols.join(', ') + `) values (`;
            out += cols.map(c => `p_${c}`).join(', ') + `);\n`;
            out += `    set p_${pkNm} = identity_val_local();\n`;
        }
        out += `    set p_result = json_object('${pkNm}': p_${pkNm});\n`;
        out += `end @\n\n`;

        // RST.upd
        out += `create or replace procedure ${tbl}_rst.upd (\n`;
        out += `    in  p_${pkNm} ${pkType},\n`;
        for (const fk of fkCols) out += `    in  p_${fk} ${fkDb2Type(this.ctx, node.fks![fk])},\n`;
        for (const child of svcCols) out += `    in  p_${child.parseName()} ${toDb2Type(child._inferTypeFull())},\n`;
        out += `    out p_result  varchar(32000),\n`;
        out += `    out p_status  integer\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare p_svc_status varchar(20);\n`;
        out += `    declare continue handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        get diagnostics exception 1 p_result = message_text;\n`;
        out += `        set p_result = json_object('error': p_result);\n`;
        out += `        set p_status = 500;\n`;
        out += `    end;\n`;
        out += `    set p_status = 200;\n`;
        if (hasSvc) {
            out += `    call ${tbl}_svc.upd(p_${pkNm}`;
            for (const fk of fkCols) out += `, p_${fk}`;
            for (const child of svcCols) out += `, p_${child.parseName()}`;
            out += `, p_svc_status);\n`;
        } else {
            out += `    -- private update (absorbed from absent _svc/_dal)\n`;
            out += `    update ${tbl} set\n`;
            const setCols = [...fkCols.map(fk => `        ${fk} = p_${fk}`), ...svcCols.map(c => `        ${c.parseName()} = p_${c.parseName()}`)];
            if (setCols.length > 0) out += setCols.join(',\n') + `\n    where ${pkNm} = p_${pkNm};\n`;
        }
        out += `    set p_result = json_object('${pkNm}': p_${pkNm});\n`;
        out += `end @\n\n`;

        // RST.del
        out += `create or replace procedure ${tbl}_rst.del (\n`;
        out += `    in  p_${pkNm} ${pkType},\n`;
        out += `    out p_result  varchar(32000),\n`;
        out += `    out p_status  integer\n`;
        out += `)\nlanguage sql\nbegin\n`;
        out += `    declare p_svc_status varchar(20);\n`;
        out += `    declare continue handler for sqlexception\n`;
        out += `    begin\n`;
        out += `        get diagnostics exception 1 p_result = message_text;\n`;
        out += `        set p_result = json_object('error': p_result);\n`;
        out += `        set p_status = 500;\n`;
        out += `    end;\n`;
        out += `    set p_status = 200;\n`;
        if (hasSvc)
            out += `    call ${tbl}_svc.del(p_${pkNm}, p_svc_status);\n`;
        else {
            out += `    -- private delete (absorbed from absent _svc/_dal)\n`;
            if (hasHks) out += `    call ${tbl}_hks.p_before_delete(p_${pkNm});\n`;
            out += `    delete from ${tbl} where ${pkNm} = p_${pkNm};\n`;
        }
        out += `    set p_result = json_object('${pkNm}': p_${pkNm}, 'deleted': 1);\n`;
        out += `end @\n\n`;

        return out;
    }
}
