import { tab } from '../../../compiler/node.js';
import type { IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer } from '../table-model.js';

/** Renders external HKS packages and the equivalent private hook stubs. */
export class OracleHooksRenderer {
    constructor(private analyzer: OracleTableApiAnalyzer) {}

    generatePrivateStubs(node: IDdlNode): string {
        const model = this.analyzer.analyze(node);
        const tbl  = model.names.table;
        const pkNm = model.names.pk;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const dimCols     = model.dimensionScopes;
        let r = `\n${tab}-- private hook stubs (no external _hks)\n\n`;
        r += `${tab}procedure p_chk_rbac (p_operation in varchar2, p_row in ${tbl}%rowtype) is begin null; end p_chk_rbac;\n`;
        if (dimCols.length > 0) {
            r += `${tab}procedure p_chk_rls (p_row in ${tbl}%rowtype) is\n`;
            r += `${tab}begin\n`;
            for (const { col, dimType } of dimCols)
                r += `${tab}${tab}sec_pkg.require_dimension_scope(p_dimension_type => '${dimType}', p_code => to_char(p_row.${col}));\n`;
            r += `${tab}end p_chk_rls;\n`;
        }
        r += `${tab}procedure p_validate (p_operation in varchar2, p_row in out nocopy ${tbl}%rowtype) is begin null; end p_validate;\n`;
        r += `${tab}procedure p_before_insert (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
        if (isVersioned) {
            r += `${tab}procedure p_before_close (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n\n`;
            r += `${tab}procedure p_after_insert (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_close  (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        } else if (isImmutable) {
            // Insert-only: no before_update/before_delete/after_update/after_delete stubs.
            r += `${tab}procedure p_after_insert (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        } else {
            r += `${tab}procedure p_before_update (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_before_delete (p_id in ${tbl}.${pkNm}%type) is begin null; end;\n`;
            r += `${tab}procedure p_after_insert  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_update  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_delete  (p_id in ${tbl}.${pkNm}%type) is begin null; end;\n\n`;
        }
        if (model.bridge !== null) {
            // /bridge: additive hook pair, alongside whichever set the branch above
            // already produced — a bridge table keeps its generic CRUD hooks too.
            r += `${tab}procedure p_before_grant  (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_grant   (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_before_revoke (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_revoke  (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        }
        return r;
    }


    generateSpec(node: IDdlNode, hasDal: boolean): string {
        const model  = this.analyzer.analyze(node);
        const tbl    = model.names.table;
        const dal    = model.names.dal;
        const pkg    = model.names.hooks;
        const idType = hasDal ? `${dal}.t_id` : `${tbl}.id%type`;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const dimCols     = model.dimensionScopes;
        let r = `create or replace package ${pkg} as\n\n`;
        // chk_rbac — always declared, empty by default; a human fills it in with a
        // real sec_pkg.require_permission call only when a resource/action pair has
        // been curated for this table's write path (never auto-populated: RBAC is
        // selective by design).
        r += `${tab}procedure chk_rbac (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in ${tbl}%rowtype\n`;
        r += `${tab});\n\n`;
        // chk_rls — generated only when this table carries a configured dimension
        // scope column (dimensioncolumns setting); absent otherwise, never an
        // empty stub (there is nothing to ever check without a scope column).
        if (dimCols.length > 0) {
            r += `${tab}procedure chk_rls (p_row in ${tbl}%rowtype);\n\n`;
        }
        r += `${tab}procedure validate (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in out nocopy ${tbl}%rowtype\n`;
        r += `${tab});\n\n`;
        r += `${tab}procedure before_insert (p_row in out nocopy ${tbl}%rowtype);\n`;
        if (isVersioned) {
            r += `${tab}procedure before_close (p_row in out nocopy ${tbl}%rowtype);\n\n`;
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_close  (p_row in ${tbl}%rowtype);\n\n`;
        } else if (isImmutable) {
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n\n`;
        } else {
            r += `${tab}procedure before_update (p_row in out nocopy ${tbl}%rowtype);\n`;
            r += `${tab}procedure before_delete (p_id in ${idType});\n\n`;
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_update (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_delete (p_id in ${idType});\n\n`;
        }
        if (model.bridge !== null) {
            r += `${tab}procedure before_grant  (p_row in out nocopy ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_grant   (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure before_revoke (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_revoke  (p_row in ${tbl}%rowtype);\n\n`;
        }
        r += `end ${bareName(pkg)};\n/\n`;
        return r;
    }


    generateBody(node: IDdlNode, hasDal: boolean): string {
        const model  = this.analyzer.analyze(node);
        const tbl    = model.names.table;
        const dal    = model.names.dal;
        const pkg    = model.names.hooks;
        const idType = hasDal ? `${dal}.t_id` : `${tbl}.id%type`;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const dimCols     = model.dimensionScopes;
        let r = `create or replace package body ${pkg} as\n`;
        r += `-- warning: this file is generated once and must not be overwritten\n\n`;
        r += `${tab}procedure chk_rbac (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in ${tbl}%rowtype\n`;
        r += `${tab}) is begin null; end chk_rbac;\n\n`;
        if (dimCols.length > 0) {
            r += `${tab}procedure chk_rls (p_row in ${tbl}%rowtype) is\n`;
            r += `${tab}begin\n`;
            for (const { col, dimType } of dimCols)
                r += `${tab}${tab}sec_pkg.require_dimension_scope(p_dimension_type => '${dimType}', p_code => to_char(p_row.${col}));\n`;
            r += `${tab}end chk_rls;\n\n`;
        }
        r += `${tab}procedure validate (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is begin null; end validate;\n\n`;
        r += `${tab}procedure before_insert (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
        if (isVersioned) {
            r += `${tab}procedure before_close (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n\n`;
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype)           is begin null; end;\n`;
            r += `${tab}procedure after_close  (p_row in ${tbl}%rowtype)           is begin null; end;\n\n`;
        } else if (isImmutable) {
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        } else {
            r += `${tab}procedure before_update (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure before_delete (p_id in ${idType}) is begin null; end;\n\n`;
            r += `${tab}procedure after_insert  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_update  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_delete  (p_id in ${idType})     is begin null; end;\n\n`;
        }
        if (model.bridge !== null) {
            r += `${tab}procedure before_grant  (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_grant   (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure before_revoke (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_revoke  (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        }
        r += `end ${bareName(pkg)};\n/\n`;
        return r;
    }

    /**
     * Ordered list of t_rec / _app parameter descriptors: FK cols → regular cols.
     * Single source of truth for SVC t_rec fields and _app parameter lists.
     * tenant_id is intentionally excluded: the DAL (or absorbed private DML) enforces it
     * via tenant_ctx.get_id (trusted server-side context) — exposing it as a caller-supplied
     * parameter would let any caller forge it.
     */

}
