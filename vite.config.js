import { defineConfig } from 'vite';

import path from 'path';
import { fileURLToPath } from 'url';

import * as buildConstants from './build-constants.js';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const gTargetLibrary = process.env[ 'TARGET_LIBRARY' ] || 'DDL';

if ( ![ 'DDL', 'DDL-ORACLE', 'DDL-DB2' ].includes( gTargetLibrary ) ) {
    throw new Error( 'Invalid TARGET_LIBRARY value. Please use one of: DDL, DDL-ORACLE, DDL-DB2' );
}

const DDL_ENTRIES = {
    'DDL':        { entry: 'src/ddl.ts',        fileName: buildConstants.__DDL_LIBRARY_FILE_NAME__ },
    'DDL-ORACLE': { entry: 'src/ddl-oracle.ts', fileName: buildConstants.__DDL_LIBRARY_FILE_NAME__ + '-oracle' },
    'DDL-DB2':    { entry: 'src/ddl-db2.ts',    fileName: buildConstants.__DDL_LIBRARY_FILE_NAME__ + '-db2' },
};

/** @type {import('vite').UserConfig} */
// eslint-disable-next-line no-unused-vars
export default defineConfig( ( { command: pCommand, mode: pMode, ssrBuild: pSsrBuild } ) => {
    return {
        root: path.join( __dirname, 'src' ),
        publicDir: path.join( __dirname, 'public' ),
        define: Object.fromEntries(
            Object.entries( buildConstants )
                .map( ( [ pKey, pValue ] ) => [ pKey, JSON.stringify( pValue ) ] )
        ),
        esbuild: {
            // NOTE: Added so that the non-ascii characters outside of comments
            //       and regular expressions are escaped as their \uXXXX
            //       equivalents
            //
            //       See https://github.com/vitejs/vite/issues/12676
            charset: 'ascii'
        },
        build: {
            copyPublicDir: false,
            outDir: path.join( __dirname, 'dist' ),
            emptyOutDir: false,
            lib: {
                entry:    path.join( __dirname, DDL_ENTRIES[ gTargetLibrary ].entry ),
                formats:  [ 'es' ],
                fileName: DDL_ENTRIES[ gTargetLibrary ].fileName,
            }
        },
    };
} );
