import { tab } from '../../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer } from '../table-model.js';

export class OracleAuditRenderer {
    constructor(
        private ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
    ) {}

    generateSpec(node: IDdlNode): string {
        const model = this.analyzer.analyze(node);
        const tbl = model.names.table;
        const aud = model.names.audit;
        let r = `create or replace package ${aud} as\n\n`;
        r += `${tab}g_enabled boolean := true;\n\n`;
        r += `${tab}procedure log_insert (p_row     in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype);\n\n`;
        r += `end ${bareName(aud)};\n/\n`;
        return r;
    }

    generateBody(node: IDdlNode, hasDal: boolean): string {
        const model    = this.analyzer.analyze(node);
        const tbl      = model.names.table;
        const dal      = model.names.dal;
        const aud      = model.names.audit;
        const pkName   = (node.getPkName() ?? 'id').toLowerCase();
        const auditLogName = String(node.getOptionValue('auditlog') || '').trim() || 'app_audit_log';
        const auditTbl = (this.ctx.objPrefix() + auditLogName).toLowerCase();
        const auditSvc = auditTbl + '_svc';
        const hasVer   = model.features.versionColumn;
        const fkCols   = model.columns.foreignKeys.map(f => f.toLowerCase());
        const svcCols  = model.columns.service.map(c => c.parseName().toLowerCase());

        // Detect whether the log table has old_values/new_values columns (Level 2 CDC).
        // Audit cols (DATE type: created/updated) are deliberately excluded from f_to_json
        // to avoid PLS-00684 — json_object does not handle DATE natively on all 19c versions.
        const auditLogNode = this.ctx.find(auditLogName);
        const hasCdcCols   = (auditLogNode?.children ?? [])
            .some(c => c.parseName().toLowerCase() === 'old_values');
        // Build the column list for f_to_json: pk + tenant_id + fks + business cols + row_version.
        // Audit metadata cols (created/updated) are excluded — they are DATE and not business state.
        const synTenantId = model.features.syntheticTenantId;
        const jsonCols = [pkName, ...(synTenantId ? ['tenant_id'] : []), ...fkCols, ...svcCols];
        if (hasVer) jsonCols.push('row_version');

        let r = `create or replace package body ${aud} as\n\n`;

        if (hasCdcCols) {
            // f_to_json — private; serialises a %rowtype snapshot to JSON for CDC logging
            const jsonPairs = jsonCols.map(c => `${tab}${tab}${tab}'${c}' value p_row.${c}`);
            r += `${tab}function f_to_json (p_row in ${tbl}%rowtype) return clob is\n`;
            r += `${tab}${tab}l_result clob;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select json_object(\n`;
            r += jsonPairs.join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}) into l_result from dual;\n`;
            r += `${tab}${tab}return l_result;\n`;
            r += `${tab}end f_to_json;\n\n`;
        }

        // p_log — private; autonomous transaction so audit survives caller rollback
        const audIdType = hasDal ? `${dal}.t_id` : `${tbl}.${pkName}%type`;
        r += `${tab}procedure p_log (\n`;
        r += `${tab}${tab}p_operation  in varchar2,\n`;
        r += `${tab}${tab}p_id         in ${audIdType}`;
        if (hasCdcCols) {
            r += `,\n${tab}${tab}p_old_values in clob default null,\n`;
            r += `${tab}${tab}p_new_values in clob default null\n`;
        } else {
            r += '\n';
        }
        r += `${tab}) is\n`;
        r += `${tab}${tab}pragma autonomous_transaction;\n`;
        r += `${tab}${tab}l_rec ${auditSvc}.t_rec;\n`;
        r += `${tab}${tab}l_id ${auditTbl}.id%type;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if not g_enabled then return; end if;\n`;
        r += `${tab}${tab}l_rec.entity    := '${tbl}';\n`;
        r += `${tab}${tab}l_rec.entity_id := p_id;\n`;
        r += `${tab}${tab}l_rec.operation := p_operation;\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}l_rec.old_values := p_old_values;\n`;
            r += `${tab}${tab}l_rec.new_values := p_new_values;\n`;
        }
        r += `${tab}${tab}${auditSvc}.create_rec(p_rec => l_rec, x_id => l_id);\n`;
        r += `${tab}${tab}-- l_id holds the generated audit record id.\n`;
        r += `${tab}${tab}-- use it here if needed, e.g. to notify, correlate, or route downstream:\n`;
        r += `${tab}${tab}-- your_pkg.on_audit(p_audit_id => l_id, p_entity => '${tbl}', p_operation => p_operation);\n`;
        r += `${tab}${tab}commit;\n`;
        r += `${tab}end p_log;\n\n`;

        r += `${tab}procedure log_insert (p_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'INSERT', p_id => p_row.${pkName}, p_new_values => f_to_json(p_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'INSERT', p_id => p_row.${pkName});\n`;
        }
        r += `${tab}end log_insert;\n\n`;

        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'UPDATE', p_id => p_new_row.${pkName}, p_old_values => f_to_json(p_old_row), p_new_values => f_to_json(p_new_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'UPDATE', p_id => p_new_row.${pkName});\n`;
        }
        r += `${tab}end log_update;\n\n`;

        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'DELETE', p_id => p_old_row.${pkName}, p_old_values => f_to_json(p_old_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'DELETE', p_id => p_old_row.${pkName});\n`;
        }
        r += `${tab}end log_delete;\n\n`;

        r += `end ${bareName(aud)};\n/\n`;
        return r;
    }

}
