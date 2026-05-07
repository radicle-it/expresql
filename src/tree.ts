// Re-export barrel for generic, database-agnostic symbols.
export { default } from './parser.js';
export { BaseGenerator } from './base-generator.js';
export { createGenerator, registerGenerator, createDiffGenerator, registerDiffGenerator } from './factory.js';
export type { GeneratorFactory, DiffGeneratorFactory } from './factory.js';
export { DdlNode } from './node.js';
export type { DiffResult, DiffStatement, DiffStatementKind, DiffWarning, DiffSummary, DiffGenerator } from './diff-types.js';
