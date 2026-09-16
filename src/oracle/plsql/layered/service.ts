import { tab } from '../../../compiler/node.js';
import type { IDdlNode } from '../../../compiler/types.js';
import { OracleTableApiAnalyzer } from '../table-model.js';
import { OracleDalRenderer } from './dal.js';
import { OracleHooksRenderer } from './hooks.js';

function bareName(name: string): string {
    const dot = name.indexOf('.');
    return dot >= 0 ? name.slice(dot + 1) : name;
}

/** Renders the service contract and coordinates DAL, hooks and audit calls. */
export class OracleServiceRenderer {
    constructor(
        private analyzer: OracleTableApiAnalyzer,
        private dal: OracleDalRenderer,
        private hooks: OracleHooksRenderer,
    ) {}

    generateSpec(node: IDdlNode): string {
        const model       = this.analyzer.analyze(node);
        const tbl         = model.names.table;
        const svc         = model.names.service;
        const pkNm        = model.names.pk;
        const hasVer      = model.features.versionColumn;
        const paramCols   = model.columns.parameters;
        const uniqueCols  = model.columns.unique;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;
        const lockDef     = model.lockDefaults;

        let r = `create or replace package ${svc} as\n\n`;

        // t_rec: writable business columns only — excludes PK, row_version, audit cols (all trigger-managed).
        // Column width computed per table instead of a fixed padEnd(20): a long name (e.g.
        // workflow_correlation_id) would otherwise run directly into the %type anchor with no separator.
        const tRecWidth = Math.max(20, ...paramCols.map(({ name }) => name.length + 1));
        r += `${tab}type t_rec is record (\n`;
        r += paramCols.map(({ name }) => `${tab}${tab}${name.padEnd(tRecWidth)}${tbl}.${name}%type`).join(',\n') + '\n';
        r += `${tab});\n\n`;

        r += `${tab}function get (\n`;
        r += `${tab}${tab}p_id           in ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in number   default ${lockDef.timeout}\n`;
        r += `${tab}) return ${tbl}%rowtype;\n\n`;

        r += `${tab}function get_all return sys_refcursor;\n\n`;

        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype;\n\n`;
        }

        r += `${tab}procedure create_rec (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}x_id  out ${tbl}.${pkNm}%type\n`;
        r += `${tab});\n\n`;

        if (isVersioned) {
            r += `${tab}procedure close_version (\n`;
            r += `${tab}${tab}p_id       in     ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;
        } else if (isImmutable) {
            // No update_rec/delete_rec — append-only.
        } else {
            r += `${tab}procedure update_rec (\n`;
            r += `${tab}${tab}p_id  in ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_rec in t_rec`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;

            r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type);\n\n`;
        }
        const bkCol = model.businessKeyColumn;
        if (bkCol !== '') {
            // /businesskey: navigate by business key instead of by the surrogate PK of
            // one specific version row, and change_rec() atomically closes the current
            // version and opens the next one — the two-call sequence (close_version then
            // create_rec) a caller would otherwise have to orchestrate by hand.
            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return sys_refcursor;\n\n`;

            r += `${tab}procedure change_rec (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(10)} in     ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_rec         in     t_rec,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab});\n\n`;
        }
        const bridge = model.bridge;
        if (bridge !== null) {
            // /bridge: grant_<rightLabel> is idempotent — granting an already-granted
            // pair succeeds and returns the existing row's id, it never raises
            // [DUPLICATE] (the unique constraint from generator.ts is what makes a
            // concurrent duplicate grant detectable at all, not just this check-first
            // path). All four names derive from the second /fk column (grant_role,
            // not grant_role_id) — see _bridgeCols.
            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(10)} in     ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(10)} in     ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}function has_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean;\n\n`;
            r += `${tab}function list_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type) return sys_refcursor;\n\n`;
        }
        r += `end ${bareName(svc)};\n/\n`;
        return r;
    }

    generateBody(node: IDdlNode, hasDal: boolean, hasHks: boolean): string {
        const model       = this.analyzer.analyze(node);
        const tbl         = model.names.table;
        const dal         = model.names.dal;
        const hk          = model.names.hooks;
        const svc         = model.names.service;
        const aud         = model.names.audit;
        const pkNm        = model.names.pk;
        const hasVer      = model.features.versionColumn;
        const hasUniq     = model.columns.unique.length > 0;
        const hasAuditLog = model.features.auditLog;
        const paramCols   = model.columns.parameters;
        const uniqueCols  = model.columns.unique;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;
        const dimCols     = model.dimensionScopes;
        const lockDef     = model.lockDefaults;

        const getById      = hasDal ? `${dal}.get_by_id`       : 'p_get_by_id';
        const lockById     = hasDal ? `${dal}.lock_by_id`      : 'p_lock_by_id';
        const lockByIdWait = hasDal ? `${dal}.lock_by_id_wait` : 'p_lock_by_id_wait';
        const getAll    = hasDal ? `${dal}.get_all`     : 'p_get_all';
        const insertRow = hasDal ? `${dal}.insert_row`  : 'p_insert_row';
        const updateRow = hasDal ? `${dal}.update_row`  : 'p_update_row';
        const deleteRow = hasDal ? `${dal}.delete_row`  : 'p_delete_row';
        const closeRow  = hasDal ? `${dal}.close_row`   : 'p_close_row';
        const getCurrentRow = hasDal ? `${dal}.get_current` : 'p_get_current';
        const getAsOfRow    = hasDal ? `${dal}.get_as_of`   : 'p_get_as_of';
        const historyCur    = hasDal ? `${dal}.history`     : 'p_history';
        const grantRow  = hasDal ? `${dal}.grant_row`  : 'p_grant_row';
        const revokeRow = hasDal ? `${dal}.revoke_row` : 'p_revoke_row';
        const hasRow    = hasDal ? `${dal}.has_row`    : 'p_has_row';
        const listRow   = hasDal ? `${dal}.list_row`   : 'p_list_row';
        const bridge    = model.bridge;
        const hkCall    = (proc: string) => hasHks ? `${hk}.${proc}` : `p_${proc}`;

        let r = `create or replace package body ${svc} as\n`;

        if (!hasDal) r += this.dal.generatePrivateDml(node);
        if (!hasHks) r += this.hooks.generatePrivateStubs(node);
        r += '\n';

        // get — routes to get_by_id / lock_by_id / lock_by_id_wait based on p_lock
        r += `${tab}function get (\n`;
        r += `${tab}${tab}p_id           in ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in number   default ${lockDef.timeout}\n`;
        r += `${tab}) return ${tbl}%rowtype is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_lock = 'nowait' then\n`;
        r += `${tab}${tab}${tab}return ${lockById}(p_id => p_id);\n`;
        r += `${tab}${tab}elsif p_lock = 'wait' then\n`;
        r += `${tab}${tab}${tab}return ${lockByIdWait}(p_id => p_id, p_timeout => p_lock_timeout);\n`;
        r += `${tab}${tab}else\n`;
        r += `${tab}${tab}${tab}return ${getById}(p_id => p_id);\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}end get;\n\n`;

        // get_all
        r += `${tab}function get_all return sys_refcursor is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}return ${getAll};\n`;
        r += `${tab}end get_all;\n\n`;

        // get_by_<unique> — one per /unique column; plain read, no locking variant
        // (DAL itself has none either — only the PK gets lock_by_id/lock_by_id_wait).
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const getByCol = hasDal ? `${dal}.get_by_${cn}` : `p_get_by_${cn}`;
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${getByCol}(p_${cn} => p_${cn});\n`;
            r += `${tab}end get_by_${cn};\n\n`;
        }

        // p_do_create — private
        r += `${tab}procedure p_do_create (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}l_row in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is\n`;
        r += `${tab}begin\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}l_row.${name} := p_rec.${name};\n`;
        r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
        if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
        r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
        r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
        r += `${tab}${tab}${insertRow}(p_row => l_row);\n`;
        r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
        if (hasAuditLog) r += `${tab}${tab}${aud}.log_insert(p_row => l_row);\n`;
        r += `${tab}end p_do_create;\n\n`;

        // create_rec — public
        r += `${tab}procedure create_rec (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}x_id  out ${tbl}.${pkNm}%type\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}p_do_create(p_rec => p_rec, l_row => l_row);\n`;
        r += `${tab}${tab}x_id := l_row.${pkNm};\n`;
        if (hasUniq) {
            r += `${tab}exception\n`;
            r += `${tab}${tab}when dup_val_on_index then\n`;
            r += `${tab}${tab}${tab}raise_application_error(-20010, '[DUPLICATE] duplicate value on unique constraint.');\n`;
        }
        r += `${tab}end create_rec;\n\n`;

        if (isVersioned) {
            // close_version — narrows the TAPI for temporally-versioned tables
            r += `${tab}procedure close_version (\n`;
            r += `${tab}${tab}p_id       in     ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getById}(p_id => p_id);\n`;
            r += `${tab}${tab}l_row.${vtCol} := p_${vtCol};\n`;
            if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_close')}(p_row => l_row);\n`;
            r += `${tab}${tab}${closeRow}(p_id => p_id, p_${vtCol} => l_row.${vtCol}, p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_close')}(p_row => l_row);\n`;
            r += `${tab}end close_version;\n\n`;
        } else if (isImmutable) {
            // No update_rec/delete_rec — append-only (see _generatePrivateDml/_generateDalBody
            // for the same narrowing at the layers below).
        } else {
            // update_rec
            r += `${tab}procedure update_rec (\n`;
            r += `${tab}${tab}p_id  in ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_rec in t_rec`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            if (hasAuditLog) r += `${tab}${tab}l_old_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getById}(p_id => p_id);\n`;
            if (hasAuditLog) r += `${tab}${tab}l_old_row := l_row;\n`;
            for (const { name } of paramCols)
                r += `${tab}${tab}l_row.${name} := p_rec.${name};\n`;
            if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'update', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'update', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_update')}(p_row => l_row);\n`;
            r += `${tab}${tab}${updateRow}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_update')}(p_row => l_row);\n`;
            if (hasAuditLog) r += `${tab}${tab}${aud}.log_update(p_old_row => l_old_row, p_new_row => l_row);\n`;
            r += `${tab}end update_rec;\n\n`;

            // delete_rec — the row is always fetched first (get_by_id) so that
            // validate('delete', ...) can finally run on delete too — until now the only
            // operation validate() never covered.
            r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getById}(p_id => p_id);\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'delete', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'delete', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_delete')}(p_id => p_id);\n`;
            r += `${tab}${tab}${deleteRow}(p_id => p_id);\n`;
            r += `${tab}${tab}${hkCall('after_delete')}(p_id => p_id);\n`;
            if (hasAuditLog) r += `${tab}${tab}${aud}.log_delete(p_old_row => l_row);\n`;
            r += `${tab}end delete_rec;\n\n`;
        }

        const bkCol = model.businessKeyColumn;
        if (bkCol !== '') {
            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${getCurrentRow}(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}end get_current;\n\n`;

            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${getAsOfRow}(p_${bkCol} => p_${bkCol}, p_as_of => p_as_of);\n`;
            r += `${tab}end get_as_of;\n\n`;

            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return sys_refcursor is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${historyCur}(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}end history;\n\n`;

            // change_rec — closes the current version as of p_<vtCol>, then opens the next
            // one via create_rec (so RBAC/validation/hooks/audit run exactly as they would
            // for a plain create). p_rec.<key> is overwritten with p_<key>, not read from
            // it: the business key is authoritative from the lookup argument, never from
            // whatever the caller happened to leave in p_rec.<key>. The two writes are not
            // wrapped in their own transaction control here (same rule as every other
            // _svc procedure in this project): the caller's transaction covers both, and a
            // failure between them rolls back the whole change_rec, not just half of it.
            r += `${tab}procedure change_rec (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(10)} in     ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_rec         in     t_rec,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_current ${tbl}%rowtype;\n`;
            r += `${tab}${tab}l_rec     t_rec := p_rec;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_current := get_current(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}${tab}l_rec.${bkCol} := p_${bkCol};\n`;
            r += `${tab}${tab}close_version(\n`;
            r += `${tab}${tab}${tab}p_id       => l_current.${pkNm},\n`;
            r += `${tab}${tab}${tab}p_${vtCol} => p_${vtCol}`;
            if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => l_current.row_version`;
            r += `\n${tab}${tab});\n`;
            r += `${tab}${tab}create_rec(p_rec => l_rec, x_id => x_id);\n`;
            r += `${tab}end change_rec;\n\n`;
        }

        if (bridge !== null) {
            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(10)} in     ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(10)} in     ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
            r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'grant', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'grant', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_grant')}(p_row => l_row);\n`;
            r += `${tab}${tab}${grantRow}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_grant')}(p_row => l_row);\n`;
            r += `${tab}${tab}x_id := l_row.${pkNm};\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when dup_val_on_index then\n`;
            r += `${tab}${tab}${tab}select ${pkNm} into x_id from ${tbl}_rls where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right};\n`;
            r += `${tab}end grant_${bridge.rightLabel};\n\n`;

            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
            r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'revoke', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'revoke', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_revoke')}(p_row => l_row);\n`;
            r += `${tab}${tab}${revokeRow}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            r += `${tab}${tab}${hkCall('after_revoke')}(p_row => l_row);\n`;
            r += `${tab}end revoke_${bridge.rightLabel};\n\n`;

            r += `${tab}function has_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${hasRow}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            r += `${tab}end has_${bridge.rightLabel};\n\n`;

            r += `${tab}function list_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type) return sys_refcursor is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${listRow}(p_${bridge.left} => p_${bridge.left});\n`;
            r += `${tab}end list_${bridge.rightLabel};\n\n`;
        }

        r += `end ${bareName(svc)};\n/\n`;
        return r;
    }

}

