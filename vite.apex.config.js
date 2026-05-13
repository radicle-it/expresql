import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundles all web/ JS files (+ dist/expresql.js) into a single IIFE.
// X6 is accessed as the global window.X6 (loaded via antv-x6.min.js), so
// it is not bundled here.
// Output: web/app_all.js   — upload this + antv-x6.min.js to APEX static files.
export default defineConfig({
    root: __dirname,
    build: {
        outDir: path.join(__dirname, 'web'),
        emptyOutDir: false,
        lib: {
            entry:    path.join(__dirname, 'web/app.js'),
            formats:  ['iife'],
            name:     'ExpreSQL',
            fileName: () => 'app_all.js',
        },
    },
});
