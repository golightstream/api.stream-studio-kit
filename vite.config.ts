/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { babel } from '@rollup/plugin-babel'
import packageJSON from './package.json'
const parseCommandLineArgsToJSON  = require('./args');
// import polyfillNode from 'rollup-plugin-polyfill-node'

// https://vitejs.dev/config/
const args = parseCommandLineArgsToJSON()

export default defineConfig({
  plugins: [
    babel({
      exclude: './node_modules/**',
      babelHelpers: 'bundled',
      extensions: ['.ts', '.tsx'],
    }),
  ],
  define: {
    SDK_VERSION: args.sdkversion ? JSON.stringify(args.sdkversion)  : JSON.stringify(packageJSON.version),
  },
  resolve: {},
  root: './',
  build: {
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: ['react', 'react-dom'],
      output: {
        inlineDynamicImports: true,
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es', 'umd'],
      name: '@api.stream/studio-kit',
    },
    sourcemap: true,
  },
})
