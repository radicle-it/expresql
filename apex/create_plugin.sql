-- =============================================================================
-- EspreSQL — APEX Plug-in: PL/SQL render package installer
-- =============================================================================
-- This script installs only the PL/SQL package used by the plug-in render
-- function.  The plug-in definition itself must be created (once) via the
-- APEX Builder UI — see doc/user/apex-plugin.md for the step-by-step guide.
--
-- Run as the APEX workspace parsing schema.
-- =============================================================================

@@espresql_plugin.pks
@@espresql_plugin.pkb

show errors package      espresql_plugin
show errors package body espresql_plugin
