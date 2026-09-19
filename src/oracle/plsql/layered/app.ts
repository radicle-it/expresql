import { tab } from '../../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer } from '../table-model.js';
import {
    parameterWidth,
    renderDuplicateValueException,
    renderInputParameterLines,
    renderOutAssignments,
    renderOutParameterBlock,
    renderRecordAssignments,
} from './rendering.js';
import { OracleDalRenderer } from './dal.js';
import { OracleHooksRenderer } from './hooks.js';
import {
    createHookNameResolver,
    renderAfterOperation,
    renderBeforeOperation,
} from './operation-hooks.js';

/** Renders the scalar interface package used by APEX and PL/SQL callers. */
export class OracleAppRenderer {
    constructor(
        private ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
        private dal: OracleDalRenderer,
        private hooks: OracleHooksRenderer,
    ) {}

    private auditColumnNames(): [string, string, string, string] {
        return [
            String(this.ctx.getOptionValue('createdcol')   ?? 'created'),
            String(this.ctx.getOptionValue('createdbycol') ?? 'created_by'),
            String(this.ctx.getOptionValue('updatedcol')   ?? 'updated'),
            String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by'),
        ];
    }

    generateSpec(node: IDdlNode): string {
        const model           = this.analyzer.analyze(node);
        const tbl             = model.names.table;
        const app             = model.names.app;
        const pkNm            = model.names.pk;
        const hasVer          = model.features.versionColumn;
        const hasAudit        = model.features.auditColumns;
        const paramCols       = model.columns.parameters;
        const uniqueCols      = model.columns.unique;
        const pkIsUserDefined = model.pkIsUserDefined;
        const isVersioned     = model.features.versioned;
        const isImmutable     = model.features.immutable;
        const vtCol           = model.versionToColumn;
        // Flat parameter list excludes the PK — it is always handled via the explicit p_id
        // parameter below, never duplicated as p_<pkNm> too (would collide when pkNm is "id",
        // and is redundant information under two names otherwise).
        const appCols         = paramCols.filter(({ name }) => name !== pkNm);
        const auditCols = this.auditColumnNames();
        const lockDef      = model.lockDefaults;

        // Column width computed per table instead of a fixed padEnd(13): a long name would
        // otherwise run directly into the %type anchor with no separator.
        const appPadWidth = parameterWidth(13, [
            ...appCols.map(({ name }) => name),
            ...(hasAudit ? auditCols : []),
        ]);

        let r = `create or replace package ${app} as\n\n`;

        // get: loads one row into OUT params — APEX Invoke API maps them to page items
        r += `${tab}procedure get (\n`;
        r += `${tab}${tab}p_id           in  ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in  varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in  number   default ${lockDef.timeout}`;
        r += renderOutParameterBlock(tbl, appCols.map(({ name }) => name), appPadWidth);
        if (hasVer)
            r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
        if (hasAudit) {
            r += renderOutParameterBlock(tbl, auditCols, appPadWidth);
        }
        r += `\n${tab});\n\n`;

        // get_by_<unique>: same OUT shape as get(), but keyed by the unique column
        // instead of p_id — which is added to the OUT list (new information the caller
        // didn't have going in) and excluded from it under its own name (redundant,
        // it's already the IN argument).
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const otherCols = appCols.filter(({ name }) => name !== cn);
            r += `${tab}procedure get_by_${cn} (\n`;
            r += `${tab}${tab}p_${cn.padEnd(appPadWidth)} in  ${tbl}.${cn}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            r += renderOutParameterBlock(tbl, otherCols.map(({ name }) => name), appPadWidth);
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            if (hasAudit) {
                r += renderOutParameterBlock(tbl, auditCols, appPadWidth);
            }
            r += `\n${tab});\n\n`;
        }

        // ins: for a user-defined PK, p_id is IN (caller supplies the key); for an
        // auto-generated PK, p_id is OUT (server-generated key returned to the caller).
        r += `${tab}procedure ins (\n`;
        const insLines: string[] = [];
        if (pkIsUserDefined) insLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
        insLines.push(...renderInputParameterLines(tbl, appCols, appPadWidth));
        if (!pkIsUserDefined) insLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
        r += insLines.join(',\n') + `\n${tab});\n\n`;

        if (isVersioned) {
            // close: replaces upd + del for temporally-versioned tables
            r += `${tab}procedure close (\n`;
            const closeLines: string[] = [];
            closeLines.push(`${tab}${tab}p_id           in     ${tbl}.${pkNm}%type`);
            closeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in     ${tbl}.${vtCol}%type default systimestamp`);
            if (hasVer) closeLines.push(`${tab}${tab}p_row_version  in     ${tbl}.row_version%type`);
            r += closeLines.join(',\n') + `\n${tab});\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            // upd: p_row_version only when /rowversion is active
            r += `${tab}procedure upd (\n`;
            const updLines: string[] = [];
            updLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
            updLines.push(...renderInputParameterLines(tbl, appCols, appPadWidth));
            if (hasVer) updLines.push(`${tab}${tab}p_row_version  in  ${tbl}.row_version%type`);
            r += updLines.join(',\n') + `\n${tab});\n\n`;

            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type);\n\n`;
        }
        const bkCol = model.businessKeyColumn;
        if (bkCol !== '') {
            // get_current/get_as_of: same OUT shape as get() — the business key column
            // itself is excluded from the OUT list (it's already the IN lookup argument),
            // p_id is added to the OUT list (unlike get(), where it's the IN argument, here
            // it's new information the caller didn't have going in).
            const lookupCols = appCols.filter(({ name }) => name !== bkCol);
            r += `${tab}procedure get_current (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            r += renderOutParameterBlock(tbl, lookupCols.map(({ name }) => name), appPadWidth);
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;

            r += `${tab}procedure get_as_of (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_as_of        in  timestamp,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            r += renderOutParameterBlock(tbl, lookupCols.map(({ name }) => name), appPadWidth);
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;

            // change_rec: same flat IN shape as ins() (appCols already include p_<key>
            // at its natural position) plus p_<vtCol> and the new version's p_id OUT.
            r += `${tab}procedure change_rec (\n`;
            const changeLines: string[] = [];
            changeLines.push(...renderInputParameterLines(tbl, appCols, appPadWidth));
            changeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in  ${tbl}.${vtCol}%type default systimestamp`);
            changeLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
            r += changeLines.join(',\n') + `\n${tab});\n\n`;
        }
        const bridge = model.bridge;
        if (bridge !== null) {
            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(13)} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(13)} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure has_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_result       out boolean\n`;
            r += `${tab});\n\n`;
            // No list_<rightLabel> here — a multi-row cursor has no honest shape as flat
            // OUT parameters (same reasoning as /businesskey's history, absent at _app).
        }
        r += `end ${bareName(app)};\n/\n`;
        return r;
    }

    generateBody(node: IDdlNode, hasSvc: boolean, _hasDal: boolean, hasHks: boolean): string {
        const model           = this.analyzer.analyze(node);
        const tbl             = model.names.table;
        const svc             = model.names.service;
        const hk              = model.names.hooks;
        const app             = model.names.app;
        const pkNm            = model.names.pk;
        const hasVer          = model.features.versionColumn;
        const hasAudit        = model.features.auditColumns;
        const hasUniq   = model.columns.unique.length > 0;
        const paramCols       = model.columns.parameters;
        const uniqueCols      = model.columns.unique;
        const pkIsUserDefined = model.pkIsUserDefined;
        const isVersioned     = model.features.versioned;
        const isImmutable     = model.features.immutable;
        const vtCol           = model.versionToColumn;
        const dimCols         = model.dimensionScopes;
        const appCols         = paramCols.filter(({ name }) => name !== pkNm);
        const auditCols = this.auditColumnNames();
        const lockDef      = model.lockDefaults;
        const hkCall    = createHookNameResolver(hk, hasHks);

        // Column width computed per table instead of a fixed padEnd(13) — same reasoning as _generateAppSpec.
        const appPadWidth = parameterWidth(13, [
            ...appCols.map(({ name }) => name),
            ...(hasAudit ? auditCols : []),
        ]);

        let r = `create or replace package body ${app} as\n`;

        // Degraded: absorb private DML + (if !hasHks) private hook stubs
        if (!hasSvc) {
            r += this.dal.generatePrivateDml(node);
            if (!hasHks) r += this.hooks.generatePrivateStubs(node);
            r += '\n';
        }

        // get — p_lock ('none'|'nowait'|'wait') controls optimistic vs pessimistic fetch
        r += `\n${tab}procedure get (\n`;
        r += `${tab}${tab}p_id           in  ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in  varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in  number   default ${lockDef.timeout}`;
        r += renderOutParameterBlock(tbl, appCols.map(({ name }) => name), appPadWidth);
        if (hasVer)
            r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
        if (hasAudit) {
            r += renderOutParameterBlock(tbl, auditCols, appPadWidth);
        }
        r += `\n${tab}) is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_id is null then return; end if;  -- INSERT mode: leave OUT params null\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_row := ${svc}.get(p_id => p_id, p_lock => p_lock, p_lock_timeout => p_lock_timeout);\n`;
        } else {
            r += `${tab}${tab}if p_lock = 'nowait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id(p_id => p_id);\n`;
            r += `${tab}${tab}elsif p_lock = 'wait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id_wait(p_id => p_id, p_timeout => p_lock_timeout);\n`;
            r += `${tab}${tab}else\n`;
            r += `${tab}${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
            r += `${tab}${tab}end if;\n`;
        }
        r += renderOutAssignments(appCols.map(({ name }) => name));
        if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
        if (hasAudit) {
            r += renderOutAssignments(auditCols);
        }
        r += `${tab}end get;\n\n`;

        // get_by_<unique> — same OUT shape as get(), keyed by the unique column;
        // p_id (new information) is OUT here instead of the IN argument it is in get().
        const getByColCall = (cn: string) => hasSvc ? `${svc}.get_by_${cn}` : `p_get_by_${cn}`;
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const otherCols = appCols.filter(({ name }) => name !== cn);
            r += `${tab}procedure get_by_${cn} (\n`;
            r += `${tab}${tab}p_${cn.padEnd(appPadWidth)} in  ${tbl}.${cn}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            r += renderOutParameterBlock(tbl, otherCols.map(({ name }) => name), appPadWidth);
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            if (hasAudit) {
                r += renderOutParameterBlock(tbl, auditCols, appPadWidth);
            }
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getByColCall(cn)}(p_${cn} => p_${cn});\n`;
            r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            r += renderOutAssignments(otherCols.map(({ name }) => name));
            if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
            if (hasAudit) {
                r += renderOutAssignments(auditCols);
            }
            r += `${tab}end get_by_${cn};\n\n`;
        }

        // ins — for a user-defined PK, p_id is IN (caller supplies the key);
        //       for an auto-generated PK, p_id is OUT (server-generated key returned to the caller)
        r += `${tab}procedure ins (\n`;
        const insLines: string[] = [];
        if (pkIsUserDefined) insLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
        insLines.push(...renderInputParameterLines(tbl, appCols, appPadWidth));
        if (!pkIsUserDefined) insLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
        r += insLines.join(',\n') + `\n${tab}) is\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_xid ${tbl}.${pkNm}%type;\n`;
            r += `${tab}begin\n`;
            r += renderRecordAssignments(appCols.map(({ name }) => name), 'l_rec', name => `p_${name}`);
            if (pkIsUserDefined) {
                r += `${tab}${tab}l_rec.${pkNm} := p_id;\n`;
                r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => l_xid);\n`;
            } else {
                r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => p_id);\n`;
            }
        } else {
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += renderRecordAssignments(appCols.map(({ name }) => name), 'l_row', name => `p_${name}`);
            if (pkIsUserDefined) r += `${tab}${tab}l_row.${pkNm} := p_id;\n`;
            r += renderBeforeOperation('insert', 'l_row', dimCols.length > 0, hkCall);
            r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
            r += renderAfterOperation('insert', 'l_row', hkCall);
            if (!pkIsUserDefined) r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            if (hasUniq) {
                r += renderDuplicateValueException();
            }
        }
        r += `${tab}end ins;\n\n`;

        if (isVersioned) {
            // close — narrows the APEX API for temporally-versioned tables
            r += `${tab}procedure close (\n`;
            const closeLines: string[] = [];
            closeLines.push(`${tab}${tab}p_id           in     ${tbl}.${pkNm}%type`);
            closeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in     ${tbl}.${vtCol}%type default systimestamp`);
            if (hasVer) closeLines.push(`${tab}${tab}p_row_version  in     ${tbl}.row_version%type`);
            r += closeLines.join(',\n') + `\n${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}begin\n`;
                r += `${tab}${tab}${svc}.close_version(\n`;
                r += `${tab}${tab}${tab}p_id => p_id,\n`;
                r += `${tab}${tab}${tab}p_${vtCol} => p_${vtCol}`;
                if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => p_row_version`;
                r += `\n${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
                r += `${tab}${tab}l_row.${vtCol} := p_${vtCol};\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
                r += renderBeforeOperation('close', 'l_row', dimCols.length > 0, hkCall);
                r += `${tab}${tab}p_close_row(p_id => p_id, p_${vtCol} => l_row.${vtCol}, p_row => l_row);\n`;
                r += renderAfterOperation('close', 'l_row', hkCall);
            }
            r += `${tab}end close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            // upd
            r += `${tab}procedure upd (\n`;
            const updLines: string[] = [];
            updLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
            updLines.push(...renderInputParameterLines(tbl, appCols, appPadWidth));
            if (hasVer) updLines.push(`${tab}${tab}p_row_version  in  ${tbl}.row_version%type`);
            r += updLines.join(',\n') + `\n${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
                r += `${tab}begin\n`;
                r += renderRecordAssignments(appCols.map(({ name }) => name), 'l_rec', name => `p_${name}`);
                r += `${tab}${tab}${svc}.update_rec(\n`;
                r += `${tab}${tab}${tab}p_id  => p_id,\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec`;
                if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => p_row_version`;
                r += `\n${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
                r += renderRecordAssignments(appCols.map(({ name }) => name), 'l_row', name => `p_${name}`);
                if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
                r += renderBeforeOperation('update', 'l_row', dimCols.length > 0, hkCall);
                r += `${tab}${tab}p_update_row(p_row => l_row);\n`;
                r += renderAfterOperation('update', 'l_row', hkCall);
                if (hasUniq) {
                    r += renderDuplicateValueException();
                }
            }
            r += `${tab}end upd;\n\n`;

            // del
            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type) is\n`;
            if (!hasSvc) r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            if (hasSvc) {
                r += `${tab}${tab}${svc}.delete_rec(p_id => p_id);\n`;
            } else {
                r += `${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
                r += renderBeforeOperation('delete', 'l_row', dimCols.length > 0, hkCall, 'p_id');
                r += `${tab}${tab}p_delete_row(p_id => p_id);\n`;
                r += renderAfterOperation('delete', 'l_row', hkCall, 'p_id');
            }
            r += `${tab}end del;\n\n`;
        }

        const bkCol = model.businessKeyColumn;
        if (bkCol !== '') {
            const lookupCols = appCols.filter(({ name }) => name !== bkCol);
            const getCurrentCall = hasSvc ? `${svc}.get_current` : 'p_get_current';
            const getAsOfCall    = hasSvc ? `${svc}.get_as_of`   : 'p_get_as_of';

            r += `${tab}procedure get_current (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            r += renderOutParameterBlock(tbl, lookupCols.map(({ name }) => name), appPadWidth);
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getCurrentCall}(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            r += renderOutAssignments(lookupCols.map(({ name }) => name));
            if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
            r += `${tab}end get_current;\n\n`;

            r += `${tab}procedure get_as_of (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_as_of        in  timestamp,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            r += renderOutParameterBlock(tbl, lookupCols.map(({ name }) => name), appPadWidth);
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getAsOfCall}(p_${bkCol} => p_${bkCol}, p_as_of => p_as_of);\n`;
            r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            r += renderOutAssignments(lookupCols.map(({ name }) => name));
            if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
            r += `${tab}end get_as_of;\n\n`;

            r += `${tab}procedure change_rec (\n`;
            const changeLines: string[] = [];
            changeLines.push(...renderInputParameterLines(tbl, appCols, appPadWidth));
            changeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in  ${tbl}.${vtCol}%type default systimestamp`);
            changeLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
            r += changeLines.join(',\n') + `\n${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
                r += `${tab}begin\n`;
                r += renderRecordAssignments(appCols.map(({ name }) => name), 'l_rec', name => `p_${name}`);
                r += `${tab}${tab}${svc}.change_rec(\n`;
                r += `${tab}${tab}${tab}p_${bkCol} => p_${bkCol},\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec,\n`;
                r += `${tab}${tab}${tab}p_${vtCol} => p_${vtCol},\n`;
                r += `${tab}${tab}${tab}x_id => p_id\n`;
                r += `${tab}${tab});\n`;
            } else {
                // No _svc to delegate to (lookup/lookup+hks tier): inline the same two
                // steps change_rec always does — close the current version, then insert
                // the next one — through the same private DML/hooks every other absorbed
                // operation on this tier already goes through.
                r += `${tab}${tab}l_current ${tbl}%rowtype;\n`;
                r += `${tab}${tab}l_row     ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_current := p_get_current(p_${bkCol} => p_${bkCol});\n`;
                r += `${tab}${tab}l_current.${vtCol} := p_${vtCol};\n`;
                r += renderBeforeOperation('close', 'l_current', dimCols.length > 0, hkCall);
                r += `${tab}${tab}p_close_row(p_id => l_current.${pkNm}, p_${vtCol} => l_current.${vtCol}, p_row => l_current);\n`;
                r += renderAfterOperation('close', 'l_current', hkCall);
                r += renderRecordAssignments(appCols.map(({ name }) => name), 'l_row', name => `p_${name}`);
                r += renderBeforeOperation('insert', 'l_row', dimCols.length > 0, hkCall);
                r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
                r += renderAfterOperation('insert', 'l_row', hkCall);
                r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            }
            r += `${tab}end change_rec;\n\n`;
        }

        const bridge = model.bridge;
        if (bridge !== null) {
            const grantCall  = hasSvc ? `${svc}.grant_${bridge.rightLabel}`  : `p_grant_row`;
            const revokeCall = hasSvc ? `${svc}.revoke_${bridge.rightLabel}` : `p_revoke_row`;
            const hasCall    = hasSvc ? `${svc}.has_${bridge.rightLabel}`    : `p_has_row`;

            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(13)} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(13)} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type\n`;
            r += `${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}begin\n`;
                r += `${tab}${tab}${grantCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right}, x_id => p_id);\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
                r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
                r += renderBeforeOperation('grant', 'l_row', dimCols.length > 0, hkCall);
                r += `${tab}${tab}${grantCall}(p_row => l_row);\n`;
                r += renderAfterOperation('grant', 'l_row', hkCall);
                r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
                r += `${tab}exception\n`;
                r += `${tab}${tab}when dup_val_on_index then\n`;
                r += `${tab}${tab}${tab}select ${pkNm} into p_id from ${tbl}_rls where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right};\n`;
            }
            r += `${tab}end grant_${bridge.rightLabel};\n\n`;

            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}begin\n`;
                r += `${tab}${tab}${revokeCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
                r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
                r += renderBeforeOperation('revoke', 'l_row', dimCols.length > 0, hkCall);
                r += `${tab}${tab}${revokeCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
                r += renderAfterOperation('revoke', 'l_row', hkCall);
            }
            r += `${tab}end revoke_${bridge.rightLabel};\n\n`;

            r += `${tab}procedure has_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_result       out boolean\n`;
            r += `${tab}) is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}p_result := ${hasCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            r += `${tab}end has_${bridge.rightLabel};\n\n`;
        }

        r += `end ${bareName(app)};\n/\n`;
        return r;
    }

}
