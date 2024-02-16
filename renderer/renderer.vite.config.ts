/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */

import { resolve } from 'path'
import { defineConfig } from 'vite'
import { babel } from '@rollup/plugin-babel'
import packageJSON from '../package.json'
import parseCommandLineArgsToJSON from '../args.mjs'

const args = parseCommandLineArgsToJSON()
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    babel({
      exclude: '../node_modules/**',
      babelHelpers: 'bundled',
      extensions: ['.ts', '.tsx'],
    }),
  ],
  define: {
    SDK_VERSION: args.sdkversion ? JSON.stringify(args.sdkversion)  : JSON.stringify(packageJSON.version),
  },
  resolve: {},
  root: '../',
  build: {
    rollupOptions: {
      input: {
        compositor: resolve(__dirname, 'index.html'),
      },
    },
    sourcemap: true,
  },
})




