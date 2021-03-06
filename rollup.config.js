/**
 * Copyright (c) 2021 Adrian Panella <ianchi74@outlook.com>
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import path from 'path';

import typescript from 'rollup-plugin-typescript2';
import nodeResolve from '@rollup/plugin-node-resolve';

import pkg from './package.json';

const MAIN_FILE = 'src/main.ts';

export default [
  {
    input: MAIN_FILE,
    external: ['tslib', 'espression', 'rxjs', 'rxjs/operators'],
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins: [nodeResolve(), typescript()],
  },

  {
    input: MAIN_FILE,
    external: ['espression', 'rxjs', 'rxjs/operators'],
    output: {
      file: pkg.es2015,
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      typescript({
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            target: 'es2017',
            declaration: true,
            declarationDir: path.dirname(pkg.types),
          },
        },
      }),
    ],
  },
];
