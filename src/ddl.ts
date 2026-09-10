// Full bundle — re-exports the core API and registers all built-in dialects.
// Import this file (or dist/expresql.js) when you need both Oracle and Db2.
export * from './ddl-core.js';
export { default } from './ddl-core.js';

import { registerGenerator, registerDiffGenerator } from './compiler/factory.js';
import { OracleDDLGenerator }  from './oracle/generator.js';
import { OracleDiffGenerator } from './oracle/diff-generator.js';
import { Db2DDLGenerator }     from './db2/generator.js';

registerGenerator('oracle', ctx => new OracleDDLGenerator(ctx));
registerGenerator('db2',    ctx => new Db2DDLGenerator(ctx));
registerDiffGenerator('oracle', _ctx => new OracleDiffGenerator());
