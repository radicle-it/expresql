import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode } from '../compiler/types.js';
import { OracleLegacyTapiBuilder } from './plsql/legacy-tapi.js';
import { OracleAggregateRenderer } from './plsql/layered/aggregate.js';
import { OracleLayeredTapiRenderer } from './plsql/layered/orchestrator.js';
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
    private aggregate:  OracleAggregateRenderer;
    private layered:    OracleLayeredTapiRenderer;

    constructor(
        private ctx: DdlContext,
        naming: Naming,
    ) {
        this.triggers   = new OracleTriggerBuilder(ctx, naming);
        this.legacyTapi = new OracleLegacyTapiBuilder(ctx);
        this.tableApi   = new OracleTableApiAnalyzer(ctx);
        this.aggregate  = new OracleAggregateRenderer(this.tableApi);
        this.layered    = new OracleLayeredTapiRenderer(ctx, this.tableApi);
    }

    restEnable(node: IDdlNode): string              { return generateRestEnable(this.ctx, node); }
    generateTrigger(node: IDdlNode): string         { return this.triggers.generate(node); }
    generateImmutableTrigger(node: IDdlNode): string { return this.triggers.generateImmutable(node); }
    generateVersionedTrigger(node: IDdlNode): string { return this.triggers.generateVersioned(node); }

    procDecl(node: IDdlNode, kind: string): string {
        return this.legacyTapi.procDecl(node, kind);
    }

    generateLayeredTAPI(node: IDdlNode): string {
        return this.layered.generate(node);
    }

    generateAggregatePackage(node: IDdlNode): string {
        return this.aggregate.generate(node);
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
