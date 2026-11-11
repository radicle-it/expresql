import type { DdlContext, IDdlNode } from '../../compiler/types.js';
import { hasSyntheticTenantId } from './table-analysis.js';

export interface OracleDimensionScope {
    col: string;
    dimType: string;
}

export interface OracleBridgeModel {
    left: string;
    right: string;
    rightLabel: string;
}

export interface OracleParameterColumn {
    name: string;
    nullable: boolean;
}

export interface OracleAggregateDetail {
    detailNode: IDdlNode;
    detailTbl: string;
    fkCol: string;
}

/** 2.1.3 — the master of a detail nested under a /aggregate table: its _app delegates writes to <master>_agg */
export interface OracleAggregateMaster {
    masterTable: string;
    masterPk: string;
    fkCol: string;
}

export interface OracleTableApiModel {
    node: IDdlNode;
    names: {
        table: string;
        pk: string;
        dal: string;
        hooks: string;
        service: string;
        app: string;
        rest: string;
        audit: string;
        tenantContext: string;
    };
    tier: string;
    capabilities: {
        hasDal: boolean;
        hasHks: boolean;
        hasSvc: boolean;
    };
    interfaces: {
        value: string;
        app: boolean;
        rest: boolean;
    };
    columns: {
        foreignKeys: string[];
        service: IDdlNode[];
        parameters: OracleParameterColumn[];
        unique: IDdlNode[];
    };
    features: {
        auditLog: boolean;
        auditColumns: boolean;
        versionColumn: boolean;
        versioned: boolean;
        immutable: boolean;
        syntheticTenantId: boolean;
        bulk: boolean;
    };
    dimensionScopes: OracleDimensionScope[];
    lockDefaults: { lock: string; timeout: number };
    versionToColumn: string;
    businessKeyColumn: string;
    bridge: OracleBridgeModel | null;
    aggregateDetails: OracleAggregateDetail[];
    aggregateMaster: OracleAggregateMaster | null;
    pkIsUserDefined: boolean;
}

/** every argument /api accepts as a layered tier: the six tiers, the legacy alias and the numeric shorthands */
export const LAYERED_TIER_NAMES = [
    'full+hks', 'full', 'service+hks', 'service', 'lookup+hks', 'lookup', 'layered',
    '3h', '3', '2h', '2', '1h', '1',
];

/**
 * True when a node gets the layered TAPI: /api with a tier, or /api under the global api: layered. The single test
 * shared by the generator, its drops and the migration diff.
 */
export function isLayeredNode(
    node: Pick<IDdlNode, 'trimmedContent' | 'getOptionValue'>,
    ctx: Pick<DdlContext, 'optionEQvalue'>,
): boolean {
    if (!node.trimmedContent().toLowerCase().includes('/api')) return false;
    const apiVal = String(node.getOptionValue('api') ?? '').trim().toLowerCase();
    return LAYERED_TIER_NAMES.includes(apiVal) || ctx.optionEQvalue('api', 'layered');
}

/** the packages a tier has: a DAL, external hooks, a service */
export function tierCapabilities(tier: string): { hasDal: boolean; hasHks: boolean; hasSvc: boolean } {
    return {
        hasDal: tier === 'full' || tier === 'full+hks',
        hasHks: tier.endsWith('+hks'),
        hasSvc: tier === 'service' || tier === 'service+hks' || tier === 'full' || tier === 'full+hks',
    };
}

/** which interface packages the interface setting asks for */
export function interfaceFlags(ctx: DdlContext): { value: string; app: boolean; rest: boolean } {
    const value = String(ctx.getOptionValue('interface') ?? 'app').toLowerCase();
    return {
        value,
        app: value === 'app' || value === 'apex' || value === 'both' || value === '',
        rest: value === 'rest' || value === 'both',
    };
}

/**
 * The packages of a layered table, in the order the drops list them. Reads only the directives (no FK analysis), so
 * a drop or a diff can name them for a node the generator has not analysed.
 */
export function layeredPackageNames(node: IDdlNode, ctx: DdlContext): string[] {
    const obj = (ctx.objPrefix() + node.parseName()).toLowerCase();
    const { hasDal, hasHks, hasSvc } = tierCapabilities(normalizeApiTier(node.getOptionValue('api')));
    const ifc = interfaceFlags(ctx);
    const pkgs: string[] = [];
    if (hasDal) pkgs.push(`${obj}_dal`);
    if (hasHks) pkgs.push(`${obj}_hks`);
    if (hasHks && hasSvc && node.isOption('bulk')) pkgs.push(`${obj}_bulk_hks`);
    if (hasSvc) pkgs.push(`${obj}_svc`);
    if (hasSvc && node.isOption('auditlog')) pkgs.push(`${obj}_aud`);
    if (ifc.app) pkgs.push(`${obj}_app`);
    if (ifc.rest) pkgs.push(`${obj}_rst`);
    return pkgs;
}

/**
 * The columns a write sets: foreign keys, then the business columns. A virtual column is computed by the database
 * and is never written.
 */
export function writableColumns(model: OracleTableApiModel): string[] {
    return [
        ...model.columns.foreignKeys.map(name => name.toLowerCase()),
        ...model.columns.service
            .filter(col => !col.isOption('virtual'))
            .map(col => col.parseName().toLowerCase()),
    ];
}

export function normalizeApiTier(value: string | number | boolean | null): string {
    const rawArg = value == null ? '' : String(value).trim();
    const raw = rawArg === '' ? 'full+hks' : rawArg.toLowerCase();
    switch (raw) {
        case 'layered': case '3h': return 'full+hks';
        case '3':                  return 'full';
        case '2h':                 return 'service+hks';
        case '2':                  return 'service';
        case '1h':                 return 'lookup+hks';
        case '1':                  return 'lookup';
        default:                   return raw;
    }
}

function lockDefaults(node: IDdlNode): { lock: string; timeout: number } {
    const raw = String(node.getOptionValue('lockmode') ?? '').trim().toLowerCase();
    if (!raw || raw === 'none') return { lock: 'none', timeout: 5 };
    if (raw === 'nowait') return { lock: 'nowait', timeout: 5 };
    if (raw === 'wait') return { lock: 'wait', timeout: 5 };
    if (raw.startsWith('wait:')) {
        const n = parseInt(raw.slice(5), 10);
        return { lock: 'wait', timeout: isNaN(n) || n < 0 ? 5 : n };
    }
    return { lock: 'none', timeout: 5 };
}

/**
 * Converts the mutable parser node into the stable decisions consumed by all
 * layered PL/SQL renderers. Analyse only after FK late-initialisation.
 */
export class OracleTableApiAnalyzer {
    private cache = new WeakMap<IDdlNode, OracleTableApiModel>();

    constructor(private ctx: DdlContext) {}

    analyze(node: IDdlNode): OracleTableApiModel {
        const cached = this.cache.get(node);
        if (cached !== undefined) return cached;

        const table = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const pk = (node.getPkName() ?? 'id').toLowerCase();
        const tier = normalizeApiTier(node.getOptionValue('api'));
        const foreignKeys = Object.keys(node.fks ?? {});
        const serviceColumns = node.children.filter(
            c => c.children.length === 0 &&
                 c.refId() === null &&
                 c.parseName().toLowerCase() !== 'row_version'
        );
        const parameters: OracleParameterColumn[] = [
            ...foreignKeys.map(name => ({ name: name.toLowerCase(), nullable: true })),
            ...serviceColumns
                .filter(col => !col.isOption('virtual'))
                .map(col => ({
                    name: col.parseName().toLowerCase(),
                    nullable: !col.isOption('nn'),
                })),
        ];
        // Columns only: a nested table declared with a table-level "/unique a, b" is a
        // child node with the same option, and must not become a get_by_<child>.
        const unique = node.children.filter(c => c.children.length === 0 && c.isOption('unique'));
        const configuredDimensions = this.ctx.getOptionValue('dimensioncolumns') as Record<string, string> | null;
        const dimensionScopes: OracleDimensionScope[] = [];
        if (configuredDimensions != null && typeof configuredDimensions === 'object') {
            for (const col of Object.keys(configuredDimensions)) {
                const cn = col.toLowerCase();
                const present = Object.prototype.hasOwnProperty.call(node.fks ?? {}, cn)
                    || node.findChild(cn) !== null;
                if (present) dimensionScopes.push({ col: cn, dimType: configuredDimensions[col] });
            }
        }

        let businessKeyColumn = '';
        if (node.isOption('versioned') && node.isOption('businesskey')) {
            const col = String(node.getOptionValue('businesskey') ?? '').trim().toLowerCase();
            if (col !== '' && node.findChild(col) !== null) businessKeyColumn = col;
        }

        let bridge: OracleBridgeModel | null = null;
        if (node.isOption('bridge') && foreignKeys.length === 2) {
            const [left, right] = foreignKeys;
            bridge = { left, right, rightLabel: right.replace(/_id$/i, '') || right };
        }

        const aggregateDetails: OracleAggregateDetail[] = [];
        if (node.isOption('aggregate')) {
            const masterName = node.parseName().toLowerCase();
            for (const child of node.children) {
                if (child.children.length === 0) continue;
                const fkCol = Object.keys(child.fks ?? {}).find(
                    fk => (child.fks![fk] ?? '').toLowerCase() === masterName
                );
                if (fkCol === undefined) continue;
                aggregateDetails.push({
                    detailNode: child,
                    detailTbl: (this.ctx.objPrefix() + child.parseName()).toLowerCase(),
                    fkCol,
                });
            }
        }

        // 2.1.3 — this table is a detail of a /aggregate master: the same FK test as aggregateDetails, seen from below
        let aggregateMaster: OracleAggregateMaster | null = null;
        const parent = node.parent;
        if (parent !== null && parent.isOption('aggregate') && node.children.length > 0) {
            const masterName = parent.parseName().toLowerCase();
            const fkCol = Object.keys(node.fks ?? {}).find(fk => (node.fks![fk] ?? '').toLowerCase() === masterName);
            if (fkCol !== undefined) {
                aggregateMaster = {
                    masterTable: (this.ctx.objPrefix() + parent.parseName()).toLowerCase(),
                    masterPk: (parent.getPkName() ?? 'id').toLowerCase(),
                    fkCol,
                };
            }
        }

        const ifc = interfaceFlags(this.ctx);
        const { hasDal, hasHks, hasSvc } = tierCapabilities(tier);
        const model: OracleTableApiModel = {
            node,
            names: {
                table,
                pk,
                dal: table + '_dal',
                hooks: table + '_hks',
                service: table + '_svc',
                app: table + '_app',
                rest: table + '_rst',
                audit: table + '_aud',
                tenantContext: this.ctx.objPrefix() + 'tenant_ctx',
            },
            tier,
            capabilities: { hasDal, hasHks, hasSvc },
            interfaces: ifc,
            columns: { foreignKeys, service: serviceColumns, parameters, unique },
            features: {
                auditLog: node.isOption('auditlog'),
                auditColumns: node.hasAuditCols(),
                versionColumn: node.hasRowVersion() || node.children.some(
                    c => c.children.length === 0 && c.parseName().toLowerCase() === 'row_version'
                ),
                versioned: node.isOption('versioned'),
                immutable: node.isOption('immutable'),
                syntheticTenantId: hasSyntheticTenantId(this.ctx, node),
                bulk: node.isOption('bulk'),
            },
            dimensionScopes,
            lockDefaults: lockDefaults(node),
            versionToColumn: (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase(),
            businessKeyColumn,
            bridge,
            aggregateDetails,
            aggregateMaster,
            pkIsUserDefined: serviceColumns.some(c => c.parseName().toLowerCase() === pk),
        };
        this.cache.set(node, model);
        return model;
    }
}
