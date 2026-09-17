import { tab } from '../../../compiler/node.js';
import type { IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer } from '../table-model.js';
import { parameterWidth } from './rendering.js';

export class OracleAggregateRenderer {
    constructor(private analyzer: OracleTableApiAnalyzer) {}

    private _aggregateDetails(node: IDdlNode): Array<{ detailNode: IDdlNode; detailTbl: string; fkCol: string }> {
        return this.analyzer.analyze(node).aggregateDetails;
    }

    private _tierInfo(node: IDdlNode): { hasDal: boolean; hasHks: boolean; hasSvc: boolean } {
        return this.analyzer.analyze(node).capabilities;
    }

    private _svcParamCols(node: IDdlNode): Array<{ name: string; nullable: boolean }> {
        return this.analyzer.analyze(node).columns.parameters;
    }

    private _pkIsUserDefined(node: IDdlNode): boolean {
        return this.analyzer.analyze(node).pkIsUserDefined;
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
    generate(node: IDdlNode): string {
        if (!node.isOption('aggregate')) return '';
        const details = this._aggregateDetails(node);
        if (details.length === 0) return '';

        const model = this.analyzer.analyze(node);
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
            const w = parameterWidth(13, names);
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
        r += `end ${bareName(agg)};\n/\n`;

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
        r += `\nend ${bareName(agg)};\n/\n`;
        return r;
    }

}
