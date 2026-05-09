// Oracle-only bundle — re-exports the core API and registers only the Oracle dialect.
// Use dist/quick-sql-oracle.js when targeting Oracle and want to exclude Db2 code.
export * from './ddl-core.js';
export { default } from './ddl-core.js';

import { registerGenerator, registerDiffGenerator } from './compiler/factory.js';
import { OracleDDLGenerator }  from './oracle/generator.js';
import { OracleDiffGenerator } from './oracle/diff-generator.js';

registerGenerator('oracle', ctx => new OracleDDLGenerator(ctx));
registerDiffGenerator('oracle', _ctx => new OracleDiffGenerator());
