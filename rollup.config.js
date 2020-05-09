import typescript from 'rollup-plugin-typescript2';
import nodeResolve from '@rollup/plugin-node-resolve';

import pkg from './package.json';
import path from 'path';

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
      {
        file: pkg.module,
        format: 'es',
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
            target: 'es2015',
            declaration: true,
            declarationDir: path.dirname(pkg.types),
          },
        },
      }),
    ],
  },
];
