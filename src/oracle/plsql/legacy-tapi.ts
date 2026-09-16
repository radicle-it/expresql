import { tab } from '../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../compiler/types.js';
import { hasSyntheticTenantId } from './table-analysis.js';

function fkPlsqlType(refNode: IDdlNode): string | null {
    const pkName = refNode.getExplicitPkName();
    if (pkName == null || pkName.includes(',')) return null;
    const pkChild = refNode.findChild(pkName);
    return pkChild != null ? pkChild.getPlsqlType() : refNode.getPkType();
}

export class OracleLegacyTapiBuilder {
    constructor(private ctx: DdlContext) {}

    procDecl(node: IDdlNode, kind: string): string {
        const modifier = kind !== 'get' ? ' default null' : '';
        const mode     = kind !== 'get' ? ' in' : 'out';
        let ret = tab + 'procedure ' + kind + '_row (\n';
        const idColName   = node.getPkName();
        const pkChild     = node.getGenIdColName() !== null ? null : node.findChild(node.getExplicitPkName()!);
        const pkPlsqlType = pkChild ? pkChild.getPlsqlType() : node.getPkType();
        ret += tab + tab + 'p_' + idColName + '        in  ' + pkPlsqlType + modifier;
        if (hasSyntheticTenantId(this.ctx, node))
            ret += ',\n' + tab + tab + 'p_tenant_id   ' + mode + '  integer' + modifier;
        for (const fk in (node.fks ?? {})) {
            const parent  = node.fks![fk];
            let type = 'integer';
            const refNode = this.ctx.find(parent);
            if (refNode !== null) type = fkPlsqlType(refNode) ?? type;
            ret += ',\n' + tab + tab + 'P_' + fk + '   ' + mode + '  ' + type + modifier;
        }
        for (const child of node.regularColumns())
            ret += ',\n' + tab + tab + 'P_' + child.parseName() + '   ' + mode + '  ' + child.getPlsqlType() + modifier;
        ret += '\n    )';
        return ret;
    }

    private _getRowBody(node: IDdlNode): string {
        const idColName   = node.getPkName();
        const objName     = this.ctx.objPrefix() + node.parseName();
        const synTenantId = hasSyntheticTenantId(this.ctx, node);
        let ret = tab + 'is \n' + tab + 'begin \n';
        const selectCols: string[] = [];
        const intoCols:   string[] = [];
        if (synTenantId) { selectCols.push('tenant_id'); intoCols.push('p_tenant_id'); }
        for (const fk in (node.fks ?? {})) { selectCols.push(fk); intoCols.push('p_' + fk); }
        for (const child of node.regularColumns()) {
            const cn = child.parseName().toLowerCase();
            selectCols.push(cn); intoCols.push('p_' + cn);
        }
        if (selectCols.length > 0) {
            const pad = tab + tab + '       ';
            ret += tab + tab + 'select ' + selectCols.join(',\n' + pad) + '\n';
            ret += tab + tab + '  into ' + intoCols.join(',\n' + pad) + '\n';
            ret += tab + tab + '  from ' + objName + '\n';
            ret += tab + tab + ' where ' + idColName + ' = p_' + idColName;
            if (synTenantId) ret += '\n' + tab + tab + '   and tenant_id = p_tenant_id';
            ret += ';\n';
        }
        ret += tab + 'exception\n' + tab + tab + 'when no_data_found then\n' + tab + tab + tab + 'null;\n';
        ret += tab + 'end get_row;\n \n';
        return ret;
    }

    private _insertRowBody(node: IDdlNode): string {
        const idColName   = node.getPkName();
        const objName     = this.ctx.objPrefix() + node.parseName();
        const synTenantId = hasSyntheticTenantId(this.ctx, node);
        let ret = tab + 'is \n' + tab + 'begin \n';
        ret += tab + tab + 'insert into ' + objName + ' ( \n' + tab + tab + tab + idColName;
        if (synTenantId) ret += ',\n' + tab + tab + tab + 'tenant_id';
        for (const fk in (node.fks ?? {})) ret += ',\n' + tab + tab + tab + fk;
        for (const child of node.regularColumns()) ret += ',\n' + tab + tab + tab + child.parseName().toLowerCase();
        ret += '\n' + tab + tab + ') values ( \n' + tab + tab + tab + 'p_' + idColName;
        if (synTenantId) ret += ',\n' + tab + tab + tab + 'p_tenant_id';
        for (const fk in (node.fks ?? {})) ret += ',\n' + tab + tab + tab + 'p_' + fk;
        for (const child of node.regularColumns()) ret += ',\n' + tab + tab + tab + 'p_' + child.parseName();
        ret += '\n' + tab + tab + ');';
        ret += '\n' + tab + 'end insert_row;\n \n \n';
        return ret;
    }

    private _updateRowBody(node: IDdlNode): string {
        const idColName   = node.getPkName();
        const objName     = this.ctx.objPrefix() + node.parseName();
        const synTenantId = hasSyntheticTenantId(this.ctx, node);
        let ret = tab + 'is \n' + tab + 'begin \n';
        ret += tab + tab + 'update  ' + objName + ' set \n' + tab + tab + tab + idColName + ' = p_' + idColName;
        for (const fk in (node.fks ?? {})) ret += ',\n' + tab + tab + tab + fk + ' = P_' + fk;
        for (const child of node.regularColumns())
            ret += ',\n' + tab + tab + tab + child.parseName().toLowerCase() + ' = P_' + child.parseName().toLowerCase();
        ret += '\n' + tab + tab + 'where ' + idColName + ' = p_' + idColName;
        if (synTenantId) ret += '\n' + tab + tab + '  and tenant_id = p_tenant_id';
        ret += ';';
        ret += '\n' + tab + 'end update_row;\n \n \n';
        return ret;
    }

    generate(node: IDdlNode): string {
        if (node.children.length === 0) return '';
        const objName     = this.ctx.objPrefix() + node.parseName();
        const idColName   = node.getPkName();
        const synTenantId = hasSyntheticTenantId(this.ctx, node);
        const delTenantParam = synTenantId ? ',\n        p_tenant_id           in integer' : '';
        const delWhere = idColName + ' = p_' + idColName + (synTenantId ? ' and tenant_id = p_tenant_id' : '');
        let ret = ('create or replace package ' + objName.toLowerCase() + '_API\nis\n\n').toLowerCase();
        ret += this.procDecl(node, 'get') + ';\n\n';
        ret += this.procDecl(node, 'insert') + ';\n\n';
        ret += this.procDecl(node, 'update') + ';\n\n';
        ret += '    procedure delete_row (\n        p_' + idColName + '              in integer' + delTenantParam + '\n    );\n'
             + 'end ' + objName.toLowerCase() + '_api;\n/\n\n';
        ret += ('create or replace package body ' + objName.toLowerCase() + '_API\nis\n\n').toLowerCase();
        ret += this.procDecl(node, 'get')    + '\n' + this._getRowBody(node);
        ret += this.procDecl(node, 'insert') + '\n' + this._insertRowBody(node);
        ret += this.procDecl(node, 'update') + '\n' + this._updateRowBody(node);
        ret += '    procedure delete_row (\n        p_' + idColName + '              in integer' + delTenantParam + '\n    )\n'
             + '    is\n    begin\n        delete from ' + objName.toLowerCase() + ' where ' + delWhere + ';\n'
             + '    end delete_row;\n'
             + 'end ' + objName.toLowerCase() + '_api;\n/\n';
        return ret.toLowerCase();
    }
}
