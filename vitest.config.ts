import { defineConfig } from 'vitest/config';
import path        from 'path';
import fs          from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Same plugin as in vite.config.js — intercepts `./legacy/xxx.js` imports
 * and redirects them to the corresponding TypeScript file in src/.
 */
function redirectLegacyToTs() {
    const srcDir = path.join(__dirname, 'src');
    return {
        name:    'redirect-legacy-to-ts',
        enforce: 'pre' as const,
        resolveId(id: string) {
            const m = id.match(/\/legacy\/([^/]+)\.js$/);
            if (!m) return null;
            const tsPath = path.join(srcDir, m[1] + '.ts');
            if (fs.existsSync(tsPath)) return tsPath;
            return null;
        },
    };
}

export default defineConfig({
    plugins: [redirectLegacyToTs()],
    define: {
        // Simulate a version string so ddl.ts / json2qsql.ts don't return 'development'
        __PACKAGE_VERSION__: JSON.stringify('test'),
    },
    test: {
        environment: 'node',
        include:     ['test/**/*.test.ts'],
        // Keep the legacy .js runner separate — Vitest only owns the .test.ts files
        exclude:     ['test/**/*.js', 'node_modules/**'],
        reporters:   ['verbose'],
    },
});
