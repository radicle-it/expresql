import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { OracleTableApiAnalyzer } from '../table-model.js';
import { OracleAppRenderer } from './app.js';
import { OracleAuditRenderer } from './audit.js';
import { OracleDalRenderer } from './dal.js';
import { OracleHooksRenderer } from './hooks.js';
import { OracleRestRenderer } from './rest.js';
import { OracleServiceRenderer } from './service.js';

/** Composes the layered TAPI artifacts in dependency order. */
export class OracleLayeredTapiRenderer {
    private audit:   OracleAuditRenderer;
    private dal:     OracleDalRenderer;
    private app:     OracleAppRenderer;
    private hooks:   OracleHooksRenderer;
    private rest:    OracleRestRenderer;
    private service: OracleServiceRenderer;

    constructor(
        ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
    ) {
        this.audit   = new OracleAuditRenderer(ctx, analyzer);
        this.dal     = new OracleDalRenderer(ctx, analyzer);
        this.hooks   = new OracleHooksRenderer(analyzer);
        this.app     = new OracleAppRenderer(ctx, analyzer, this.dal, this.hooks);
        this.rest    = new OracleRestRenderer(analyzer, this.dal, this.hooks);
        this.service = new OracleServiceRenderer(analyzer, this.dal, this.hooks);
    }

    /**
     * Row-scope view used by every read path. With dimension columns it delegates
     * filtering to sec_pkg; otherwise it is a plain passthrough over the table.
     */
    private generateDimensionRlsView(node: IDdlNode): string {
        const model = this.analyzer.analyze(node);
        const tbl = model.names.table;
        const source = model.dimensionScopes.length > 0
            ? `sec_pkg.secured_by_dimension(${tbl})`
            : tbl;
        return `create or replace view ${tbl}_rls as\nselect * from ${source};\n/\n`;
    }

    generate(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (node.children.length === 0) return '';

        const model = this.analyzer.analyze(node);
        const { hasDal, hasHks, hasSvc } = model.capabilities;
        const hasAudit = model.features.auditLog;
        const genApp = model.interfaces.app;
        const genRst = model.interfaces.rest;

        let r = '';
        const rlsView = this.generateDimensionRlsView(node);
        if (rlsView) r += rlsView + '\n';
        if (hasDal) r += this.dal.generateSpec(node) + '\n' + this.dal.generateBody(node) + '\n';
        if (hasHks) r += this.hooks.generateSpec(node, hasDal) + '\n' + this.hooks.generateBody(node, hasDal) + '\n';
        if (hasSvc) {
            r += this.service.generateSpec(node) + '\n';
            // The audit spec must precede the service body, which references it.
            if (hasAudit) r += this.audit.generateSpec(node) + '\n';
            r += this.service.generateBody(node, hasDal, hasHks) + '\n';
            if (hasAudit) r += this.audit.generateBody(node, hasDal) + '\n';
        }
        if (genApp) r += this.app.generateSpec(node) + '\n' + this.app.generateBody(node, hasSvc, hasDal, hasHks);
        if (genRst) {
            if (genApp) r += '\n';
            r += this.rest.generateSpec(node) + '\n' + this.rest.generateBody(node, hasSvc, hasDal, hasHks);
        }
        return r;
    }
}
