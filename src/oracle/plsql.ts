import { tab } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode } from '../compiler/types.js';
import { OracleLegacyTapiBuilder } from './plsql/legacy-tapi.js';
import { OracleDalRenderer } from './plsql/layered/dal.js';
import { OracleAppRenderer } from './plsql/layered/app.js';
import { OracleHooksRenderer } from './plsql/layered/hooks.js';
import { OracleRestRenderer } from './plsql/layered/rest.js';
import { OracleServiceRenderer } from './plsql/layered/service.js';
import { generateRestEnable } from './plsql/ords.js';
import { OracleTableApiAnalyzer } from './plsql/table-model.js';
import {
    generateTenantBootstrapBody,
    generateTenantBootstrapSpec,
    generateTenantCtxBody,
    generateTenantCtxSpec,
} from './plsql/tenant-context.js';
import { OracleTriggerBuilder } from './plsql/triggers.js';

/**
 * Handles Oracle REST enable, trigger generation, and Table API (TAPI)
 * for OracleDDLGenerator.
 */
export class OraclePlsqlBuilder {
    private triggers:   OracleTriggerBuilder;
    private legacyTapi: OracleLegacyTapiBuilder;
    private tableApi:   OracleTableApiAnalyzer;
    private dal:        OracleDalRenderer;
    private app:        OracleAppRenderer;
    private hooks:      OracleHooksRenderer;
    private rest:       OracleRestRenderer;
    private service:    OracleServiceRenderer;

    constructor(
        private ctx: DdlContext,
        naming: Naming,
    ) {
        this.triggers   = new OracleTriggerBuilder(ctx, naming);
        this.legacyTapi = new OracleLegacyTapiBuilder(ctx);
        this.tableApi   = new OracleTableApiAnalyzer(ctx);
        this.dal        = new OracleDalRenderer(ctx, this.tableApi);
        this.hooks      = new OracleHooksRenderer(this.tableApi);
        this.app        = new OracleAppRenderer(ctx, this.tableApi, this.dal, this.hooks);
        this.rest       = new OracleRestRenderer(this.tableApi, this.dal, this.hooks);
        this.service    = new OracleServiceRenderer(this.tableApi, this.dal, this.hooks);
    }

    // Strip schema prefix from a qualified name — used in PL/SQL END clauses where
    // Oracle requires the simple identifier, not schema.name.
    private _bare(name: string): string {
        const dot = name.indexOf('.');
        return dot >= 0 ? name.slice(dot + 1) : name;
    }

    restEnable(node: IDdlNode): string              { return generateRestEnable(this.ctx, node); }
    generateTrigger(node: IDdlNode): string         { return this.triggers.generate(node); }
    generateImmutableTrigger(node: IDdlNode): string { return this.triggers.generateImmutable(node); }
    generateVersionedTrigger(node: IDdlNode): string { return this.triggers.generateVersioned(node); }

    // ── Table API (TAPI) ──────────────────────────────────────────────────────

    /**
     * Row-scope view for every table, generated once here instead of re-derived as a
     * WHERE-clause predicate in every read path: get_by_id/lock_by_id/get_all/
     * get_by_<unique> (in _dal, or the absorbed private DML when _dal is absent)
     * always read from this view, never from the base table — the presentation layer
     * must never read a table directly, only a view, even when there is no dimension
     * column to filter. With a configured dimension column, the view filters via the
     * project's own sec_pkg.secured_by_dimension macro (real column introspection,
     * the same one any APEX region/report reads through); without one, it is a plain
     * passthrough (select * from <table>) — same shape, same consumer, no
     * special-casing needed by callers.
     */
    private _generateDimensionRlsView(node: IDdlNode): string {
        const model = this.tableApi.analyze(node);
        const tbl = model.names.table;
        const dimCols = model.dimensionScopes;
        const source = dimCols.length > 0 ? `sec_pkg.secured_by_dimension(${tbl})` : tbl;
        return `create or replace view ${tbl}_rls as\nselect * from ${source};\n/\n`;
    }

    procDecl(node: IDdlNode, kind: string): string {
        return this.legacyTapi.procDecl(node, kind);
    }

    // ── Layered TAPI ─────────────────────────────────────────────────────────

    // /aggregate — only meaningful with at least one nested detail table (enforced
    // by error-msgs.ts aggregate_checks; a table with /aggregate but no nested
    // children generates nothing extra). A "detail" is any DIRECT child that is
    // itself a table (children.length > 0 distinguishes a nested table from a
    // plain column — same test regularColumns() already relies on); one level
    // only, a detail's own nested children are not treated as the master's
    // details too. `fkCol` is whichever of the detail's own /fk columns points
    // back at this master (by target table name, case-insensitively) — a detail
    // with no such FK is skipped (defensive: shouldn't happen for a properly
    // nested child, mirrors the same stance as an invalid /businesskey column).
    private _aggregateDetails(node: IDdlNode): Array<{ detailNode: IDdlNode; detailTbl: string; fkCol: string }> {
        return this.tableApi.analyze(node).aggregateDetails;
    }

    // Tier flags for an arbitrary node (not necessarily the one plsql.ts's main
    // dispatch is currently generating for) — needed by generateAggregatePackage
    // to know which layer of the *detail* table (not the master) to call, since
    // /api tier is a per-table setting and the two can differ.
    private _tierInfo(node: IDdlNode): { hasDal: boolean; hasHks: boolean; hasSvc: boolean } {
        return this.tableApi.analyze(node).capabilities;
    }

    private _generateDalSpec(node: IDdlNode): string {
        return this.dal.generateSpec(node);
    }

    private _generateDalBody(node: IDdlNode): string {
        return this.dal.generateBody(node);
    }

    private _generateHksSpec(node: IDdlNode, hasDal: boolean): string {
        return this.hooks.generateSpec(node, hasDal);
    }

    private _generateHksBody(node: IDdlNode, hasDal: boolean): string {
        return this.hooks.generateBody(node, hasDal);
    }

    /**
     * Ordered list of t_rec / _app parameter descriptors: FK cols → regular cols.
     * Single source of truth for SVC t_rec fields and _app parameter lists.
     * tenant_id is intentionally excluded: the DAL (or absorbed private DML) enforces it
     * via tenant_ctx.get_id (trusted server-side context) — exposing it as a caller-supplied
     * parameter would let any caller forge it.
     */
    private _svcParamCols(node: IDdlNode): Array<{ name: string; nullable: boolean }> {
        return this.tableApi.analyze(node).columns.parameters;
    }

    /**
     * True when the user explicitly declared the PK column in the table definition
     * (pk: none / genpk: no with e.g. `id vc100 /pk /nn`) rather than relying on an
     * auto-generated key. _svcCols() does not exclude the PK by name — an explicit PK
     * column is a real child node like any other — so paramCols/t_rec already carry it.
     */
    private _pkIsUserDefined(node: IDdlNode): boolean {
        return this.tableApi.analyze(node).pkIsUserDefined;
    }

    private _generateSvcSpec(node: IDdlNode): string {
        return this.service.generateSpec(node);
    }

    private _generateSvcBody(node: IDdlNode, hasDal: boolean, hasHks: boolean): string {
        return this.service.generateBody(node, hasDal, hasHks);
    }

    private _generateAppSpec(node: IDdlNode): string {
        return this.app.generateSpec(node);
    }

    private _generateAppBody(node: IDdlNode, hasSvc: boolean, hasDal: boolean, hasHks: boolean): string {
        return this.app.generateBody(node, hasSvc, hasDal, hasHks);
    }

    private _generateRstSpec(node: IDdlNode): string {
        return this.rest.generateSpec(node);
    }

    private _generateRstBody(node: IDdlNode, hasSvc: boolean, hasDal: boolean, hasHks: boolean): string {
        return this.rest.generateBody(node, hasSvc, hasDal, hasHks);
    }

    private _generateAuditSpec(node: IDdlNode): string {
        const model = this.tableApi.analyze(node);
        const tbl = model.names.table;
        const aud = model.names.audit;
        let r = `create or replace package ${aud} as\n\n`;
        r += `${tab}g_enabled boolean := true;\n\n`;
        r += `${tab}procedure log_insert (p_row     in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype);\n\n`;
        r += `end ${this._bare(aud)};\n/\n`;
        return r;
    }

    private _generateAuditBody(node: IDdlNode, hasDal: boolean): string {
        const model    = this.tableApi.analyze(node);
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

        r += `end ${this._bare(aud)};\n/\n`;
        return r;
    }

    generateLayeredTAPI(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (node.children.length === 0) return '';

        const model = this.tableApi.analyze(node);
        const { hasDal, hasHks, hasSvc } = model.capabilities;
        const hasAudit = model.features.auditLog;
        const genApp = model.interfaces.app;
        const genRst = model.interfaces.rest;

        let r = '';
        // Emitted once, ahead of every package, unconditionally (every table gets its
        // _rls view now, not just dimension-scoped ones) and tier-independently:
        // whether reads live in _dal or are absorbed into whichever package sits
        // above the missing _dal, they need this view either way (see
        // _generateDimensionRlsView).
        const rlsView = this._generateDimensionRlsView(node);
        if (rlsView) r += rlsView + '\n';
        if (hasDal) r += this._generateDalSpec(node) + '\n' + this._generateDalBody(node) + '\n';
        if (hasHks) r += this._generateHksSpec(node, hasDal) + '\n' + this._generateHksBody(node, hasDal) + '\n';
        if (hasSvc) {
            r += this._generateSvcSpec(node) + '\n';
            // Audit spec must precede SVC body: SVC body references the audit package
            if (hasAudit) r += this._generateAuditSpec(node) + '\n';
            r += this._generateSvcBody(node, hasDal, hasHks) + '\n';
            if (hasAudit) r += this._generateAuditBody(node, hasDal) + '\n';
        }
        if (genApp) r += this._generateAppSpec(node) + '\n' + this._generateAppBody(node, hasSvc, hasDal, hasHks);
        if (genRst) {
            if (genApp) r += '\n';
            r += this._generateRstSpec(node) + '\n' + this._generateRstBody(node, hasSvc, hasDal, hasHks);
        }
        return r;
    }

    /**
     * /aggregate — a standalone `<master>_agg` package exposing add_/remove_/list_
     * per nested detail table, generated as an isolated SECOND PASS after every
     * table's own layered TAPI (see generator.ts's caller): each detail's own
     * _svc/_app package must already exist in the compiled script by the time this
     * one references it, and tree pre-order means a detail is only ever emitted
     * strictly after its parent — so this cannot be folded into generateLayeredTAPI
     * without either reordering the whole main loop or duplicating detail logic.
     *
     * Deliberately NOT wired into the master's own _app/_rst: this package is meant
     * to be called directly (same as any _svc package already is), keeping the
     * master's existing generation functions completely untouched — the lowest-risk
     * option for a feature that otherwise touches parent-child plumbing used
     * everywhere in the generator. Bulk/replace-style operations and multi-level
     * nesting (a detail that is itself a master) are out of scope for this cut.
     */
    generateAggregatePackage(node: IDdlNode): string {
        if (!node.isOption('aggregate')) return '';
        const details = this._aggregateDetails(node);
        if (details.length === 0) return '';

        const model = this.tableApi.analyze(node);
        const mTbl  = model.names.table;
        const mPkNm = model.names.pk;
        const agg   = mTbl + '_agg';
        const genApp = model.interfaces.app;

        type Detail = {
            detailNode: IDdlNode; detailTbl: string; fkCol: string;
            dPkNm: string; dSvc: string; dApp: string; dRls: string;
            cols: Array<{ name: string; nullable: boolean }>;
            pkIsUserDefined: boolean;
            hasSvc: boolean;
            canWrite: boolean;   // some flat-param create target exists (_svc or _app)
            canDelete: boolean;  // canWrite AND not /versioned or /immutable
        };
        const ds: Detail[] = details.map(({ detailNode, detailTbl, fkCol }) => {
            const { hasSvc } = this._tierInfo(detailNode);
            const canWrite = hasSvc || genApp;
            const narrowed = detailNode.isOption('versioned') || detailNode.isOption('immutable');
            return {
                detailNode, detailTbl, fkCol,
                dPkNm: (detailNode.getPkName() ?? 'id').toLowerCase(),
                dSvc: detailTbl + '_svc',
                dApp: detailTbl + '_app',
                dRls: detailTbl + '_rls',
                cols: this._svcParamCols(detailNode).filter(({ name }) => name !== fkCol),
                pkIsUserDefined: this._pkIsUserDefined(detailNode),
                hasSvc,
                canWrite,
                canDelete: canWrite && !narrowed,
            };
        });

        // Builds the padded IN/OUT parameter list shared by add_<detail>'s spec
        // and body declarations — same shape as _generateAppSpec's ins(), with
        // p_master_id standing in for the FK column (fixed by this package, never
        // caller-supplied for the FK field itself).
        const addParams = (d: Detail): string[] => {
            const names = ['master_id', ...(d.pkIsUserDefined ? [d.dPkNm] : []), ...d.cols.map(c => c.name)];
            const w = Math.max(13, ...names.map(n => n.length + 1));
            const lines: string[] = [`${tab}${tab}p_master_id`.padEnd(tab.length * 2 + 2 + w) + `in  ${mTbl}.${mPkNm}%type`];
            if (d.pkIsUserDefined)
                lines.push(`${tab}${tab}p_${d.dPkNm}`.padEnd(tab.length * 2 + 2 + w) + `in  ${d.detailTbl}.${d.dPkNm}%type`);
            for (const { name, nullable } of d.cols)
                lines.push(`${tab}${tab}p_${name}`.padEnd(tab.length * 2 + 2 + w) + `in  ${d.detailTbl}.${name}%type${nullable ? ' default null' : ''}`);
            if (!d.pkIsUserDefined)
                lines.push(`${tab}${tab}x_id`.padEnd(tab.length * 2 + 2 + w) + `out ${d.detailTbl}.${d.dPkNm}%type`);
            return lines;
        };

        // ── spec ─────────────────────────────────────────────────────────────
        let r = `create or replace package ${agg} as\n\n`;
        for (const d of ds) {
            if (!d.canWrite) {
                // No PL/SQL-callable create target: detail's tier has no _svc, and
                // interface is rest-only so it has no _app either — only its _rst
                // (JSON-based, not flat-param callable) exists. add_/remove_ are
                // skipped for this detail; list_ still works (plain select).
                r += `${tab}-- ${d.detailTbl}: no add_/remove_ (no _svc and no _app to call — rest-only interface + lookup-family tier)\n\n`;
            }
            if (d.canWrite) {
                r += `${tab}procedure add_${d.detailTbl} (\n`;
                r += addParams(d).join(',\n') + `\n${tab});\n\n`;
            }
            if (d.canDelete) {
                r += `${tab}procedure remove_${d.detailTbl} (\n`;
                r += `${tab}${tab}p_master_id in ${mTbl}.${mPkNm}%type,\n`;
                r += `${tab}${tab}p_${d.dPkNm} in ${d.detailTbl}.${d.dPkNm}%type\n`;
                r += `${tab});\n\n`;
            }
            r += `${tab}function list_${d.detailTbl} (p_master_id in ${mTbl}.${mPkNm}%type) return sys_refcursor;\n\n`;
        }
        r += `end ${this._bare(agg)};\n/\n`;

        // ── body ─────────────────────────────────────────────────────────────
        r += `\ncreate or replace package body ${agg} as\n`;
        for (const d of ds) {
            if (d.canWrite) {
                r += `\n${tab}procedure add_${d.detailTbl} (\n`;
                r += addParams(d).join(',\n') + `\n${tab}) is\n`;
                if (d.hasSvc) {
                    r += `${tab}${tab}l_rec ${d.dSvc}.t_rec;\n`;
                    r += `${tab}begin\n`;
                    r += `${tab}${tab}l_rec.${d.fkCol} := p_master_id;\n`;
                    for (const { name } of d.cols)
                        r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
                    if (d.pkIsUserDefined) {
                        r += `${tab}${tab}l_rec.${d.dPkNm} := p_${d.dPkNm};\n`;
                        r += `${tab}${tab}${d.dSvc}.create_rec(p_rec => l_rec, x_id => l_rec.${d.dPkNm});\n`;
                    } else {
                        r += `${tab}${tab}${d.dSvc}.create_rec(p_rec => l_rec, x_id => x_id);\n`;
                    }
                } else {
                    r += `${tab}begin\n`;
                    r += `${tab}${tab}${d.dApp}.ins(\n`;
                    const callLines: string[] = [`${tab}${tab}${tab}p_${d.fkCol} => p_master_id`];
                    if (d.pkIsUserDefined) callLines.push(`${tab}${tab}${tab}p_${d.dPkNm} => p_${d.dPkNm}`);
                    for (const { name } of d.cols)
                        callLines.push(`${tab}${tab}${tab}p_${name} => p_${name}`);
                    if (!d.pkIsUserDefined) callLines.push(`${tab}${tab}${tab}p_${d.dPkNm} => x_id`);
                    r += callLines.join(',\n') + `\n${tab}${tab});\n`;
                }
                r += `${tab}end add_${d.detailTbl};\n`;
            }
            if (d.canDelete) {
                r += `\n${tab}procedure remove_${d.detailTbl} (\n`;
                r += `${tab}${tab}p_master_id in ${mTbl}.${mPkNm}%type,\n`;
                r += `${tab}${tab}p_${d.dPkNm} in ${d.detailTbl}.${d.dPkNm}%type\n`;
                r += `${tab}) is\n`;
                r += `${tab}${tab}l_owner ${d.detailTbl}.${d.fkCol}%type;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}begin\n`;
                r += `${tab}${tab}${tab}select ${d.fkCol} into l_owner from ${d.dRls} where ${d.dPkNm} = p_${d.dPkNm};\n`;
                r += `${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${d.detailTbl}: record not found (${d.dPkNm}=' || p_${d.dPkNm} || ')');\n`;
                r += `${tab}${tab}end;\n`;
                r += `${tab}${tab}if l_owner is null or l_owner != p_master_id then\n`;
                r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${d.detailTbl}: ${d.dPkNm}=' || p_${d.dPkNm} || ' does not belong to ${mTbl} ' || p_master_id);\n`;
                r += `${tab}${tab}end if;\n`;
                r += d.hasSvc
                    ? `${tab}${tab}${d.dSvc}.delete_rec(p_id => p_${d.dPkNm});\n`
                    : `${tab}${tab}${d.dApp}.del(p_id => p_${d.dPkNm});\n`;
                r += `${tab}end remove_${d.detailTbl};\n`;
            }
            r += `\n${tab}function list_${d.detailTbl} (p_master_id in ${mTbl}.${mPkNm}%type) return sys_refcursor is\n`;
            r += `${tab}${tab}l_cur sys_refcursor;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}open l_cur for select * from ${d.dRls} where ${d.fkCol} = p_master_id;\n`;
            r += `${tab}${tab}return l_cur;\n`;
            r += `${tab}end list_${d.detailTbl};\n`;
        }
        r += `\nend ${this._bare(agg)};\n/\n`;
        return r;
    }

    generateTAPI(node: IDdlNode): string {
        return this.legacyTapi.generate(node);
    }

    /**
     * Spec for the shared tenant-context package (layered TAPI, tenantid: yes; read-only side).
     * Emitted once before any DAL/absorbed-DML that references <prefix>tenant_ctx.get_id —
     * single point of configuration instead of a private function duplicated per table.
     * Contains ONLY get_id: a pure SYS_CONTEXT read has no privilege restriction, so this
     * package is safe to grant broadly to application/APEX runtime roles. Mutating the
     * context (set_id/clear_id) lives in the separate, more tightly-granted
     * generateTenantBootstrapSpec/Body package — see its doc comment for why.
     */
    generateTenantCtxSpec(prefix: string): string {
        return generateTenantCtxSpec(prefix);
    }

    /** Body for the shared tenant-context package (read-only side). */
    generateTenantCtxBody(prefix: string): string {
        return generateTenantCtxBody(prefix);
    }

    /**
     * Spec for the tenant-bootstrap package (mutating side: set_id/clear_id).
     * This is the package that must be named in `CREATE CONTEXT <ns> USING <this pkg>` — Oracle
     * restricts DBMS_SESSION.SET_CONTEXT/CLEAR_CONTEXT for a given namespace to callers compiled
     * inside that exact trusted package (ORA-01031 otherwise), so set_id and clear_id cannot live
     * in the general-purpose <prefix>tenant_ctx package if that one is meant to be granted broadly
     * to application/APEX runtime roles. Grant EXECUTE on this package ONLY to a trusted bootstrap
     * principal (a logon trigger's owning schema, or a dedicated auth handler) — never to the
     * general application role, which should only get EXECUTE on <prefix>tenant_ctx (get_id).
     */
    generateTenantBootstrapSpec(prefix: string): string {
        return generateTenantBootstrapSpec(prefix);
    }

    /** Body for the tenant-bootstrap package (mutating side: set_id/clear_id). */
    generateTenantBootstrapBody(prefix: string): string {
        return generateTenantBootstrapBody(prefix);
    }
}
