create or replace package expresql_plugin
    authid definer
as
    /*
    ** ExpreSQL — APEX Region Plugin render package
    **
    ** Render function for the "IT.RADICLE.EXPRESQL" region plug-in.
    ** The plug-in renders ExpreSQL directly into the APEX page (no iframe).
    ** HTML, CSS, and JS are served from static files uploaded to the application.
    **
    ** CSS files loaded by the render function (in order):
    **   {base}web/app.css          — ExpreSQL UI styles
    **   {base}apex/apex-plugin.css — adapter: resets body flex, scopes share button
    **
    ** JS files loaded at end of <body> (in order):
    **   {base}dist/antv-x6.min.js  — AntV X6 graph library (window.X6 global)
    **   {base}web/app_all.js       — bundled ExpreSQL app (run: npm run build:web)
    **
    ** Plug-in attributes (configured in Shared Components > Plug-ins):
    **   Attribute 01 — Theme           : dark | light | apex  (default: apex)
    **   Attribute 02 — Height          : CSS height expression (default: calc(100vh - 120px))
    **   Attribute 03 — Show Share btn  : Y | N                (default: N)
    **   Attribute 04 — Files base URL  : path prefix where ExpreSQL static files
    **                                    are uploaded, ending with "/".
    **                                    Supports #APP_IMAGES# and #WORKSPACE_IMAGES#
    **                                    substitutions.
    **                                    Example: #APP_IMAGES#expresql/v2/
    */

    function render (
        p_region in            apex_plugin.t_region,
        p_plugin in            apex_plugin.t_plugin,
        p_param  in            apex_plugin.t_region_render_param,
        p_result in out nocopy apex_plugin.t_region_render_result
    ) return apex_plugin.t_region_render_result;

end expresql_plugin;
/
