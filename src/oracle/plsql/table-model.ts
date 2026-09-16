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
    };
    dimensionScopes: OracleDimensionScope[];
    lockDefaults: { lock: string; timeout: number };
    versionToColumn: string;
    businessKeyColumn: string;
    bridge: OracleBridgeModel | null;
    aggregateDetails: OracleAggregateDetail[];
    pkIsUserDefined: boolean;
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
            ...serviceColumns.map(col => ({
                name: col.parseName().toLowerCase(),
                nullable: !col.isOption('nn'),
            })),
        ];
        const unique = node.children.filter(c => c.isOption('unique'));
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

        const ifc = String(this.ctx.getOptionValue('interface') ?? 'app').toLowerCase();
        const hasDal = tier === 'full' || tier === 'full+hks';
        const hasHks = tier.endsWith('+hks');
        const hasSvc = tier === 'service' || tier === 'service+hks' || tier === 'full' || tier === 'full+hks';
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
            interfaces: {
                value: ifc,
                app: ifc === 'app' || ifc === 'apex' || ifc === 'both' || ifc === '',
                rest: ifc === 'rest' || ifc === 'both',
            },
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
            },
            dimensionScopes,
            lockDefaults: lockDefaults(node),
            versionToColumn: (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase(),
            businessKeyColumn,
            bridge,
            aggregateDetails,
            pkIsUserDefined: serviceColumns.some(c => c.parseName().toLowerCase() === pk),
        };
        this.cache.set(node, model);
        return model;
    }
}
