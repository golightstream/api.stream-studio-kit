/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */

import { resolve } from 'path'
import { defineConfig } from 'vite'
import { babel } from '@rollup/plugin-babel'
import packageJSON from '../package.json'

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
    SDK_VERSION: JSON.stringify(packageJSON.version),
  },
  resolve: {},
  root: '../',
  build: {
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        inlineDynamicImports: true,
      },
      input: {
        compositor: resolve(__dirname, 'index.html'),
      },
    },
    sourcemap: true,
  },
})
