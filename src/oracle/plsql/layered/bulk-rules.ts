import { normalizeApiTier, tierCapabilities } from '../table-model.js';

/** The part of a parsed node the rules of /bulk read: shared by the generator and the editor's checker. */
export interface BulkRuleNode {
    isOption(key: string): boolean;
    getOptionValue(option: string): unknown;
    parent: BulkRuleNode | null;
    children: unknown[];
    getTransColumns(): unknown[];
}

/**
 * Why /bulk is refused on a table, or null (82b §3.7-3.8). The generator throws it, the editor shows it as a
 * warning: one list of rules for both.
 */
export function bulkRefusal(node: BulkRuleNode, layered: boolean): string | null {
    if (!layered)
        return 'has no layered TAPI: give it /api with a service tier (service, service+hks, full or full+hks)';
    const tier = normalizeApiTier(node.getOptionValue('api') as string | null);
    if (!tierCapabilities(tier).hasSvc)
        return `has no service (tier ${tier}): a bulk write goes through <table>_svc, use service, service+hks, full or full+hks`;
    if (node.isOption('versioned') || node.isOption('businesskey'))
        return 'is /versioned: a new version is a change_rec, bulk versions are not supported';
    if (node.parent !== null && node.parent.isOption('aggregate') && node.children.length > 0)
        return 'is a detail of an /aggregate: write it through the master\'s _agg';
    if (node.isOption('auditlog'))
        return 'has /auditlog: the audit log commits one autonomous transaction per row, which a rolled back batch would leave behind';
    if (node.isOption('bridge'))
        return 'is a /bridge: grant and revoke have their own operations';
    if (node.isOption('soda'))
        return 'is a /soda collection';
    if (node.isOption('history'))
        return 'has /history: not analysed for bulk writes';
    if (node.isOption('flashback') || node.isOption('fda'))
        return 'has /flashback: not analysed for bulk writes';
    if (node.getTransColumns().length > 0)
        return 'has translated columns (/trans): not analysed for bulk writes';
    return null;
}
