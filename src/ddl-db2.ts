// Db2-only bundle — re-exports the core API and registers only the IBM Db2 dialect.
// Use dist/quick-sql-db2.js when targeting Db2 LUW and want to exclude Oracle code.
export * from './ddl-core.js';
export { default } from './ddl-core.js';

import { registerGenerator } from './compiler/factory.js';
import { Db2DDLGenerator } from './db2/generator.js';

registerGenerator('db2', ctx => new Db2DDLGenerator(ctx));
