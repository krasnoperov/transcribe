import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default {
  input: 'src/cli.ts',
  output: {
    file: 'dist/cli.js',
    format: 'esm',
    sourcemap: false,
    banner: '#!/usr/bin/env node',
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({
      preferBuiltins: true,
      browser: false,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
    }),
  ],
  external: [
    /^node:/,
  ],
}
