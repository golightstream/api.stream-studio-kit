/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { babel } from '@rollup/plugin-babel'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      exclude: './node_modules/**',
      babelHelpers: 'bundled',
      extensions: ['.ts', '.tsx'],
    }),
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3006,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        guest: resolve(__dirname, 'guest/index.html'),
        compositor: resolve(__dirname, 'compositor/index.html'),
      },
    },
    minify: false,
    sourcemap: true,
  },
  define: {
    // Required for local development on studio-sdk
    SDK_VERSION: JSON.stringify('dev'),
  },
})
