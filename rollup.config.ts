import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import copy from 'rollup-plugin-copy';
import dts from 'rollup-plugin-dts';

const external = ['n8n-workflow', /^node:/];

export default defineConfig([
  {
    input: {
      index: 'src/index.ts',
      'credentials/HermesApi.credentials': 'src/credentials/HermesApi.credentials.ts',
      'nodes/Hermes/Hermes.node': 'src/nodes/Hermes/Hermes.node.ts',
      'nodes/Hermes/toolSchemas': 'src/nodes/Hermes/toolSchemas.ts',
    },
    output: {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      exports: 'named',
      preserveModules: false,
    },
    external,
    plugins: [
      alias({
        entries: [{ find: '@', replacement: 'src' }],
      }),
      nodeResolve({ preferBuiltins: true, exportConditions: ['node'] }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        outDir: 'dist',
      }),
      copy({
        targets: [
          {
            src: 'src/nodes/Hermes/hermes.svg',
            dest: 'dist/nodes/Hermes',
          },
        ],
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    external,
    plugins: [
      alias({ entries: [{ find: '@', replacement: 'src' }] }),
      dts({ tsconfig: './tsconfig.json' }),
    ],
  },
]);
