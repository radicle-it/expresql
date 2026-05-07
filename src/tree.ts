// Re-export barrel for generic, database-agnostic symbols.
export { default } from './compiler/parser.js';
export { BaseGenerator } from './compiler/base-generator.js';
export { createGenerator, registerGenerator, createDiffGenerator, registerDiffGenerator } from './compiler/factory.js';
export type { GeneratorFactory, DiffGeneratorFactory } from './compiler/factory.js';
export { DdlNode } from './compiler/node.js';
export type { DiffResult, DiffStatement, DiffStatementKind, DiffWarning, DiffSummary, DiffGenerator } from './compiler/diff-types.js';
