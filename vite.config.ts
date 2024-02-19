/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import parseCommandLineArgsToJSON from './args.mjs'
import packageJSON from './package.json'

// https://vitejs.dev/config/
const args = parseCommandLineArgsToJSON()

export default defineConfig({
  plugins: [
    nodePolyfills({
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
      },
    }),
  ],
  define: {
    SDK_VERSION: args.sdkversion
      ? JSON.stringify(args.sdkversion)
      : JSON.stringify(packageJSON.version),
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
