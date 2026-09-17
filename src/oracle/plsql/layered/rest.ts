import { tab } from '../../../compiler/node.js';
import type { IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer } from '../table-model.js';
import { OracleDalRenderer } from './dal.js';
import { OracleHooksRenderer } from './hooks.js';

/** Renders the JSON interface package used by ORDS REST handlers. */
export class OracleRestRenderer {
    constructor(
        private analyzer: OracleTableApiAnalyzer,
        private dal: OracleDalRenderer,
        private hooks: OracleHooksRenderer,
    ) {}

    generateSpec(node: IDdlNode): string {
        const model = this.analyzer.analyze(node);
        const rst = model.names.rest;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        let r = `create or replace package ${rst} as\n\n`;
        r += `${tab}procedure get;\n`;
        r += `${tab}procedure get_all;\n`;
        for (const col of node.children.filter(c => c.isOption('unique')))
            r += `${tab}procedure get_by_${col.parseName().toLowerCase()};\n`;
        r += `${tab}procedure ins;\n`;
        if (isVersioned) {
            r += `${tab}procedure close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            r += `${tab}procedure upd;\n`;
            r += `${tab}procedure del;\n\n`;
        }
        if (model.businessKeyColumn !== '') {
            r += `${tab}procedure get_current;\n`;
            r += `${tab}procedure get_as_of;\n`;
            r += `${tab}procedure history;\n`;
            r += `${tab}procedure change_rec;\n\n`;
        }
        {
            const bridge = model.bridge;
            if (bridge !== null) {
                r += `${tab}procedure grant_${bridge.rightLabel};\n`;
                r += `${tab}procedure revoke_${bridge.rightLabel};\n`;
                r += `${tab}procedure has_${bridge.rightLabel};\n`;
                r += `${tab}procedure list_${bridge.rightLabel};\n\n`;
            }
        }
        r += `end ${bareName(rst)};\n/\n`;
        return r;
    }

    generateBody(node: IDdlNode, hasSvc: boolean, _hasDal: boolean, hasHks: boolean): string {
        const model           = this.analyzer.analyze(node);
        const tbl             = model.names.table;
        const svc             = model.names.service;
        const hk              = model.names.hooks;
        const rst             = model.names.rest;
        const pkNm            = model.names.pk;
        const hasVer          = model.features.versionColumn;
        const lockDef         = model.lockDefaults;
        const paramCols       = model.columns.parameters;
        const pkIsUserDefined = model.pkIsUserDefined;
        const isVersioned     = model.features.versioned;
        const isImmutable     = model.features.immutable;
        const vtCol           = model.versionToColumn;
        const dimCols         = model.dimensionScopes;
        // jsonCols/rstCols exclude the PK from the generic loop — it is always the first
        // json_object key (below) and, for ins, extracted from the body explicitly when
        // user-defined; for upd it is deliberately NOT re-extracted from the body (immutable,
        // comes only from :p_id — see the pkIsUserDefined branch in ins below).
        const rstCols   = paramCols.filter(({ name }) => name !== pkNm);
        const hkCall    = (proc: string) => hasHks ? `${hk}.${proc}` : `p_${proc}`;

        const jsonCols = [pkNm, ...rstCols.map(p => p.name)];
        if (hasVer) jsonCols.push('row_version');

        const excTail =
            `${tab}exception\n` +
            `${tab}${tab}when others then\n` +
            `${tab}${tab}${tab}rollback;\n` +
            `${tab}${tab}${tab}:status := case sqlcode\n` +
            `${tab}${tab}${tab}${tab}when -20001 then 409\n` +
            `${tab}${tab}${tab}${tab}when -20002 then 404\n` +
            `${tab}${tab}${tab}${tab}when -20003 then 409\n` +
            `${tab}${tab}${tab}${tab}else              500\n` +
            `${tab}${tab}${tab}end;\n` +
            `${tab}${tab}${tab}htp.p(json_object('error_code' value sqlcode, 'message' value sqlerrm, 'detail' value dbms_utility.format_error_backtrace));\n`;

        let r = `create or replace package body ${rst} as\n`;

        if (!hasSvc) {
            r += this.dal.generatePrivateDml(node);
            if (!hasHks) r += this.hooks.generatePrivateStubs(node);
            r += '\n';
        }

        // get — optional ?lock=nowait|wait and ?lock_timeout=n ORDS bind params
        r += `\n${tab}procedure get is\n`;
        r += `${tab}${tab}l_row          ${tbl}%rowtype;\n`;
        r += `${tab}${tab}l_lock         varchar2(10) := nvl(:lock, '${lockDef.lock}');\n`;
        r += `${tab}${tab}l_lock_timeout number       := nvl(to_number(:lock_timeout), ${lockDef.timeout});\n`;
        r += `${tab}begin\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_row := ${svc}.get(p_id => :p_id, p_lock => l_lock, p_lock_timeout => l_lock_timeout);\n`;
        } else {
            r += `${tab}${tab}if l_lock = 'nowait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id(p_id => :p_id);\n`;
            r += `${tab}${tab}elsif l_lock = 'wait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id_wait(p_id => :p_id, p_timeout => l_lock_timeout);\n`;
            r += `${tab}${tab}else\n`;
            r += `${tab}${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
            r += `${tab}${tab}end if;\n`;
        }
        r += `${tab}${tab}:status := 200;\n`;
        r += `${tab}${tab}htp.p(json_object(\n`;
        r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
        r += `${tab}${tab}${tab}returning clob\n`;
        r += `${tab}${tab}));\n`;
        r += excTail + `${tab}end get;\n\n`;

        // get_all
        r += `${tab}procedure get_all is\n`;
        r += `${tab}${tab}l_cur sys_refcursor;\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}${tab}l_sep varchar2(1) := '';\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}l_cur := ${hasSvc ? `${svc}.get_all` : 'p_get_all'};\n`;
        r += `${tab}${tab}htp.p('[');\n`;
        r += `${tab}${tab}loop\n`;
        r += `${tab}${tab}${tab}fetch l_cur into l_row;\n`;
        r += `${tab}${tab}${tab}exit when l_cur%notfound;\n`;
        r += `${tab}${tab}${tab}htp.p(l_sep || json_object(\n`;
        r += jsonCols.map(c => `${tab}${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
        r += `${tab}${tab}${tab}${tab}returning clob\n`;
        r += `${tab}${tab}${tab}));\n`;
        r += `${tab}${tab}${tab}l_sep := ',';\n`;
        r += `${tab}${tab}end loop;\n`;
        r += `${tab}${tab}close l_cur;\n`;
        r += `${tab}${tab}htp.p(']');\n`;
        r += `${tab}${tab}:status := 200;\n`;
        r += excTail + `${tab}end get_all;\n\n`;

        // get_by_<unique> — same JSON shape as get(), looked up by :p_<col> instead of :p_id
        for (const col of node.children.filter(c => c.isOption('unique'))) {
            const cn = col.parseName().toLowerCase();
            const getByColCall = hasSvc ? `${svc}.get_by_${cn}` : `p_get_by_${cn}`;
            r += `${tab}procedure get_by_${cn} is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getByColCall}(p_${cn} => :p_${cn});\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}));\n`;
            r += excTail + `${tab}end get_by_${cn};\n\n`;
        }

        // ins
        r += `${tab}procedure ins is\n`;
        r += `${tab}${tab}l_body clob := :body_text;\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_rec  ${svc}.t_rec;\n`;
        } else {
            r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
        }
        r += `${tab}${tab}l_id   ${tbl}.${pkNm}%type;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
        r += `${tab}${tab}${tab}:status := 400;\n`;
        r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
        r += `${tab}${tab}${tab}return;\n`;
        r += `${tab}${tab}end if;\n`;
        if (hasSvc) {
            for (const { name } of rstCols)
                r += `${tab}${tab}l_rec.${name} := json_value(l_body, '$.${name}');\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_rec.${pkNm} := json_value(l_body, '$.${pkNm}');\n`;
            r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => l_id);\n`;
        } else {
            for (const { name } of rstCols)
                r += `${tab}${tab}l_row.${name} := json_value(l_body, '$.${name}');\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_row.${pkNm} := json_value(l_body, '$.${pkNm}');\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
            r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
            r += `${tab}${tab}l_id := l_row.${pkNm};\n`;
        }
        r += `${tab}${tab}:status := 201;\n`;
        r += `${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
        r += excTail + `${tab}end ins;\n\n`;

        if (isVersioned) {
            // close — close :p_id with valid_to from body (or systimestamp)
            r += `${tab}procedure close is\n`;
            r += `${tab}${tab}l_body clob := :body_text;\n`;
            if (hasSvc) {
                if (hasVer) r += `${tab}${tab}l_rv   ${tbl}.row_version%type;\n`;
                r += `${tab}begin\n`;
                if (hasVer) {
                    r += `${tab}${tab}l_rv := json_value(l_body, '$.row_version' returning ${tbl}.row_version%type);\n`;
                    r += `${tab}${tab}${svc}.close_version(\n`;
                    r += `${tab}${tab}${tab}p_id          => :p_id,\n`;
                    r += `${tab}${tab}${tab}p_${vtCol}     => coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp),\n`;
                    r += `${tab}${tab}${tab}p_row_version => l_rv\n`;
                    r += `${tab}${tab});\n`;
                } else {
                    r += `${tab}${tab}${svc}.close_version(\n`;
                    r += `${tab}${tab}${tab}p_id   => :p_id,\n`;
                    r += `${tab}${tab}${tab}p_${vtCol} => coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp)\n`;
                    r += `${tab}${tab});\n`;
                }
            } else {
                r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
                r += `${tab}${tab}l_row.${vtCol} := coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp);\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := json_value(l_body, '$.row_version' returning ${tbl}.row_version%type);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_close')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_close_row(p_id => :p_id, p_${vtCol} => l_row.${vtCol}, p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_close')}(p_row => l_row);\n`;
            }
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value :p_id));\n`;
            r += excTail;
            r += `${tab}end close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            // upd
            r += `${tab}procedure upd is\n`;
            r += `${tab}${tab}l_body clob := :body_text;\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec  ${svc}.t_rec;\n`;
            } else {
                r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
            }
            r += `${tab}begin\n`;
            r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
            r += `${tab}${tab}${tab}:status := 400;\n`;
            r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
            r += `${tab}${tab}${tab}return;\n`;
            r += `${tab}${tab}end if;\n`;
            if (hasSvc) {
                for (const { name } of rstCols)
                    r += `${tab}${tab}l_rec.${name} := json_value(l_body, '$.${name}');\n`;
                r += `${tab}${tab}${svc}.update_rec(\n`;
                r += `${tab}${tab}${tab}p_id  => :p_id,\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec`;
                if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => json_value(l_body, '$.row_version' returning ${tbl}.row_version%type)`;
                r += `\n${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
                for (const { name } of rstCols)
                    r += `${tab}${tab}l_row.${name} := json_value(l_body, '$.${name}');\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := json_value(l_body, '$.row_version' returning ${tbl}.row_version%type);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'update', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'update', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_update')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_update_row(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_update')}(p_row => l_row);\n`;
            }
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value :p_id));\n`;
            r += excTail + `${tab}end upd;\n\n`;

            // del
            r += `${tab}procedure del is\n`;
            if (!hasSvc) r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            if (hasSvc) {
                r += `${tab}${tab}${svc}.delete_rec(p_id => :p_id);\n`;
            } else {
                r += `${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'delete', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'delete', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_delete')}(p_id => :p_id);\n`;
                r += `${tab}${tab}p_delete_row(p_id => :p_id);\n`;
                r += `${tab}${tab}${hkCall('after_delete')}(p_id => :p_id);\n`;
            }
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value :p_id));\n`;
            r += excTail + `${tab}end del;\n\n`;
        }

        const bkCol = model.businessKeyColumn;
        if (bkCol !== '') {
            const getCurrentCall = hasSvc ? `${svc}.get_current` : 'p_get_current';
            const getAsOfCall    = hasSvc ? `${svc}.get_as_of`   : 'p_get_as_of';
            const historyCall    = hasSvc ? `${svc}.history`     : 'p_history';
            const changeCols     = rstCols.filter(({ name }) => name !== bkCol);

            // get_current — same JSON shape as get(), looked up by :p_<key> instead of :p_id
            r += `${tab}procedure get_current is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getCurrentCall}(p_${bkCol} => :p_${bkCol});\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}));\n`;
            r += excTail + `${tab}end get_current;\n\n`;

            // get_as_of — :as_of is an ORDS query-param bind, ISO-8601-ish
            // ('YYYY-MM-DDTHH24:MI:SS[.FF3]'); same JSON shape as get_current.
            r += `${tab}procedure get_as_of is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getAsOfCall}(p_${bkCol} => :p_${bkCol}, p_as_of => to_timestamp(:as_of, 'YYYY-MM-DD"T"HH24:MI:SS.FF3'));\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}));\n`;
            r += excTail + `${tab}end get_as_of;\n\n`;

            // history — JSON array of every version for :p_<key>, oldest first (same
            // fetch-loop shape as get_all).
            r += `${tab}procedure history is\n`;
            r += `${tab}${tab}l_cur sys_refcursor;\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}${tab}l_sep varchar2(1) := '';\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_cur := ${historyCall}(p_${bkCol} => :p_${bkCol});\n`;
            r += `${tab}${tab}htp.p('[');\n`;
            r += `${tab}${tab}loop\n`;
            r += `${tab}${tab}${tab}fetch l_cur into l_row;\n`;
            r += `${tab}${tab}${tab}exit when l_cur%notfound;\n`;
            r += `${tab}${tab}${tab}htp.p(l_sep || json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}${tab}));\n`;
            r += `${tab}${tab}${tab}l_sep := ',';\n`;
            r += `${tab}${tab}end loop;\n`;
            r += `${tab}${tab}close l_cur;\n`;
            r += `${tab}${tab}htp.p(']');\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += excTail + `${tab}end history;\n\n`;

            // change_rec — :p_<key> (bind) identifies the row to close; the body carries
            // the next version's attributes (key excluded — always :p_<key>, never the
            // body's own copy of it) and an optional close instant (defaults to now).
            r += `${tab}procedure change_rec is\n`;
            r += `${tab}${tab}l_body clob := :body_text;\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec  ${svc}.t_rec;\n`;
            } else {
                r += `${tab}${tab}l_current ${tbl}%rowtype;\n`;
                r += `${tab}${tab}l_row     ${tbl}%rowtype;\n`;
            }
            r += `${tab}${tab}l_id   ${tbl}.${pkNm}%type;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
            r += `${tab}${tab}${tab}:status := 400;\n`;
            r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
            r += `${tab}${tab}${tab}return;\n`;
            r += `${tab}${tab}end if;\n`;
            if (hasSvc) {
                for (const { name } of changeCols)
                    r += `${tab}${tab}l_rec.${name} := json_value(l_body, '$.${name}');\n`;
                r += `${tab}${tab}${svc}.change_rec(\n`;
                r += `${tab}${tab}${tab}p_${bkCol} => :p_${bkCol},\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec,\n`;
                r += `${tab}${tab}${tab}p_${vtCol} => coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp),\n`;
                r += `${tab}${tab}${tab}x_id => l_id\n`;
                r += `${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_current := p_get_current(p_${bkCol} => :p_${bkCol});\n`;
                r += `${tab}${tab}l_current.${vtCol} := coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_current);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('before_close')}(p_row => l_current);\n`;
                r += `${tab}${tab}p_close_row(p_id => l_current.${pkNm}, p_${vtCol} => l_current.${vtCol}, p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('after_close')}(p_row => l_current);\n`;
                for (const { name } of changeCols)
                    r += `${tab}${tab}l_row.${name} := json_value(l_body, '$.${name}');\n`;
                r += `${tab}${tab}l_row.${bkCol} := :p_${bkCol};\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
                r += `${tab}${tab}l_id := l_row.${pkNm};\n`;
            }
            r += `${tab}${tab}:status := 201;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
            r += excTail + `${tab}end change_rec;\n\n`;
        }

        {
            const bridge = model.bridge;
            if (bridge !== null) {
                const grantCall  = hasSvc ? `${svc}.grant_${bridge.rightLabel}`  : 'p_grant_row';
                const revokeCall = hasSvc ? `${svc}.revoke_${bridge.rightLabel}` : 'p_revoke_row';
                const hasCall    = hasSvc ? `${svc}.has_${bridge.rightLabel}`    : 'p_has_row';
                const listCall   = hasSvc ? `${svc}.list_${bridge.rightLabel}`   : 'p_list_row';

                // grant/revoke read both key columns from :body_text, same convention as
                // ins/upd — not from URI binds, so the two /fk values are never split
                // across path and body depending on which side is "the resource".
                r += `${tab}procedure grant_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_body clob := :body_text;\n`;
                r += `${tab}${tab}l_id   ${tbl}.${pkNm}%type;\n`;
                if (!hasSvc) r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
                r += `${tab}${tab}${tab}:status := 400;\n`;
                r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
                r += `${tab}${tab}${tab}return;\n`;
                r += `${tab}${tab}end if;\n`;
                if (hasSvc) {
                    r += `${tab}${tab}${grantCall}(\n`;
                    r += `${tab}${tab}${tab}p_${bridge.left} => json_value(l_body, '$.${bridge.left}'),\n`;
                    r += `${tab}${tab}${tab}p_${bridge.right} => json_value(l_body, '$.${bridge.right}'),\n`;
                    r += `${tab}${tab}${tab}x_id => l_id\n`;
                    r += `${tab}${tab});\n`;
                } else {
                    r += `${tab}${tab}l_row.${bridge.left} := json_value(l_body, '$.${bridge.left}');\n`;
                    r += `${tab}${tab}l_row.${bridge.right} := json_value(l_body, '$.${bridge.right}');\n`;
                    r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'grant', p_row => l_row);\n`;
                    if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('validate')}(p_operation => 'grant', p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('before_grant')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${grantCall}(p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('after_grant')}(p_row => l_row);\n`;
                    r += `${tab}${tab}l_id := l_row.${pkNm};\n`;
                }
                r += `${tab}${tab}:status := 201;\n`;
                r += `${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
                if (!hasSvc) {
                    r += `${tab}exception\n`;
                    r += `${tab}${tab}when dup_val_on_index then\n`;
                    r += `${tab}${tab}${tab}select ${pkNm} into l_id from ${tbl}_rls where ${bridge.left} = l_row.${bridge.left} and ${bridge.right} = l_row.${bridge.right};\n`;
                    r += `${tab}${tab}${tab}:status := 201;\n`;
                    r += `${tab}${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
                    r += excTail.replace(`${tab}exception\n`, '');
                } else {
                    r += excTail;
                }
                r += `${tab}end grant_${bridge.rightLabel};\n\n`;

                r += `${tab}procedure revoke_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_body clob := :body_text;\n`;
                if (!hasSvc) r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
                r += `${tab}${tab}${tab}:status := 400;\n`;
                r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
                r += `${tab}${tab}${tab}return;\n`;
                r += `${tab}${tab}end if;\n`;
                if (hasSvc) {
                    r += `${tab}${tab}${revokeCall}(\n`;
                    r += `${tab}${tab}${tab}p_${bridge.left} => json_value(l_body, '$.${bridge.left}'),\n`;
                    r += `${tab}${tab}${tab}p_${bridge.right} => json_value(l_body, '$.${bridge.right}')\n`;
                    r += `${tab}${tab});\n`;
                } else {
                    r += `${tab}${tab}l_row.${bridge.left} := json_value(l_body, '$.${bridge.left}');\n`;
                    r += `${tab}${tab}l_row.${bridge.right} := json_value(l_body, '$.${bridge.right}');\n`;
                    r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'revoke', p_row => l_row);\n`;
                    if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('validate')}(p_operation => 'revoke', p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('before_revoke')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${revokeCall}(p_${bridge.left} => l_row.${bridge.left}, p_${bridge.right} => l_row.${bridge.right});\n`;
                    r += `${tab}${tab}${hkCall('after_revoke')}(p_row => l_row);\n`;
                }
                r += `${tab}${tab}:status := 200;\n`;
                r += `${tab}${tab}htp.p(json_object('status' value 'revoked'));\n`;
                r += excTail + `${tab}end revoke_${bridge.rightLabel};\n\n`;

                // has/list are GET-style reads — :p_<left>/:p_<right> binds, like get_by_<col>.
                r += `${tab}procedure has_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_result boolean;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_result := ${hasCall}(p_${bridge.left} => :p_${bridge.left}, p_${bridge.right} => :p_${bridge.right});\n`;
                r += `${tab}${tab}:status := 200;\n`;
                r += `${tab}${tab}htp.p(json_object('has' value (case when l_result then 1 else 0 end)));\n`;
                r += excTail + `${tab}end has_${bridge.rightLabel};\n\n`;

                r += `${tab}procedure list_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_cur sys_refcursor;\n`;
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}${tab}l_sep varchar2(1) := '';\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_cur := ${listCall}(p_${bridge.left} => :p_${bridge.left});\n`;
                r += `${tab}${tab}htp.p('[');\n`;
                r += `${tab}${tab}loop\n`;
                r += `${tab}${tab}${tab}fetch l_cur into l_row;\n`;
                r += `${tab}${tab}${tab}exit when l_cur%notfound;\n`;
                r += `${tab}${tab}${tab}htp.p(l_sep || json_object(\n`;
                r += jsonCols.map(c => `${tab}${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
                r += `${tab}${tab}${tab}${tab}returning clob\n`;
                r += `${tab}${tab}${tab}));\n`;
                r += `${tab}${tab}${tab}l_sep := ',';\n`;
                r += `${tab}${tab}end loop;\n`;
                r += `${tab}${tab}close l_cur;\n`;
                r += `${tab}${tab}htp.p(']');\n`;
                r += `${tab}${tab}:status := 200;\n`;
                r += excTail + `${tab}end list_${bridge.rightLabel};\n\n`;
            }
        }

        r += `end ${bareName(rst)};\n/\n`;
        return r;
    }

}
