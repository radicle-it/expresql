import { tab } from '../../compiler/node.js';
import { bareName } from './names.js';

export function generateTenantCtxSpec(prefix: string): string {
    const pkg = (prefix + 'tenant_ctx').toLowerCase();
    let r = `-- Shared tenant-isolation context provider (read-only side)\n`;
    r += `create or replace package ${pkg} as\n\n`;
    r += `${tab}-- Returns the tenant ID bound to the current session (null when not set).\n`;
    r += `${tab}-- Safe to grant broadly: a SYS_CONTEXT read carries no privilege restriction.\n`;
    r += `${tab}function get_id return integer;\n\n`;
    r += `end ${bareName(pkg)};\n/\n`;
    return r;
}

export function generateTenantCtxBody(prefix: string): string {
    const pkg = (prefix + 'tenant_ctx').toLowerCase();
    let r = `create or replace package body ${pkg} as\n\n`;
    r += `${tab}function get_id return integer is\n`;
    r += `${tab}begin\n`;
    r += `${tab}${tab}return to_number(sys_context('${pkg}', 'tenant_id'));\n`;
    r += `${tab}end get_id;\n\n`;
    r += `end ${bareName(pkg)};\n/\n`;
    return r;
}

export function generateTenantBootstrapSpec(prefix: string): string {
    const ctxPkg = (prefix + 'tenant_ctx').toLowerCase();
    const bootPkg = (prefix + 'tenant_bootstrap').toLowerCase();
    let r = `-- Tenant-isolation bootstrap provider (mutating side: set_id/clear_id)\n`;
    r += `-- Run once as DBA: create or replace context ${ctxPkg} using ${bootPkg};\n`;
    r += `-- Grant EXECUTE on ${bootPkg} ONLY to a trusted bootstrap principal (logon trigger\n`;
    r += `-- owner or auth handler) — never to the general application/APEX runtime role.\n`;
    r += `create or replace package ${bootPkg} as\n\n`;
    r += `${tab}-- Binds the tenant ID at session start (logon trigger or REST auth handler).\n`;
    r += `${tab}procedure set_id(p_tenant_id in integer);\n\n`;
    r += `${tab}-- Clears the tenant ID bound to the current session (connection-pool checkout\n`;
    r += `${tab}-- boundaries, logoff, or test teardown).\n`;
    r += `${tab}procedure clear_id;\n\n`;
    r += `end ${bareName(bootPkg)};\n/\n`;
    return r;
}

export function generateTenantBootstrapBody(prefix: string): string {
    const ctxPkg = (prefix + 'tenant_ctx').toLowerCase();
    const bootPkg = (prefix + 'tenant_bootstrap').toLowerCase();
    let r = `create or replace package body ${bootPkg} as\n\n`;
    r += `${tab}procedure set_id(p_tenant_id in integer) is\n`;
    r += `${tab}begin\n`;
    r += `${tab}${tab}dbms_session.set_context('${ctxPkg}', 'tenant_id', to_char(p_tenant_id));\n`;
    r += `${tab}end set_id;\n\n`;
    r += `${tab}procedure clear_id is\n`;
    r += `${tab}begin\n`;
    r += `${tab}${tab}dbms_session.clear_context('${ctxPkg}');\n`;
    r += `${tab}end clear_id;\n\n`;
    r += `end ${bareName(bootPkg)};\n/\n`;
    return r;
}
