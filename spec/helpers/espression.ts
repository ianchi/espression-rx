/**
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { ESnextParser } from 'espression';
import { TestScheduler } from 'rxjs/testing';

import { ReactiveEval } from '../../src/main';

const parser = new ESnextParser(true);
const _eval = new ReactiveEval();
function evaluate(expression: string, context: any) {
  return _eval.evaluate(parser.parse(expression), context);
}
(global as any).espression = { parser, eval: _eval, evaluate };

export function testScheduler(): TestScheduler {
  return new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
}
