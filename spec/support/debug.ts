/*!
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { ESnextParser } from 'espression';
import { TestScheduler } from 'rxjs/testing';

import { reactiveEvalFactory } from '../../src/reactive';
import { RxObject, GET_OBSERVABLE } from '../../src/main';
import assert from 'assert';

const rxEval = reactiveEvalFactory();
const parser = new ESnextParser(true, undefined, undefined, false);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const variableDiff = require('variable-diff'); // eslint-disable-line @typescript-eslint/no-var-requires

export function* makeIterator() {
  yield 1;
  yield 2;
}

function testObservable() {
  const values = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    a: 'a',
    b: 'b',
    c: 'c',
    o: { 1: 'o1', 2: 'o2', 3: 'o3' },
    p: { 1: 'p1', 2: 'p2', 3: 'p3' },
    q: { 1: 'q1', 2: 'q2', 3: 'q3' },
    u: undefined,
  };
  const testScheduler = new TestScheduler((actual, expected) => {
    const diff = variableDiff(expected, actual);

    if (diff.changed) {
      console.log(diff.text);
    } else console.log('Test OK');
  });

  testScheduler.run(({ expectObservable, cold, flush }) => {
    const expr = 'rx.x = o';
    const proxy1 = '--9-8-7|';
    const result = '5-9-8-7-';
    const subscr = '^-----------!';

    const rx = RxObject({ x: 5 });

    const context = { a: 1, b: 5, rx, o: cold(proxy1, values) };
    const e1 = rxEval.evaluate(parser.parse(expr), context);

    expectObservable(e1).toBe(proxy1, values);
    expectObservable(rx[GET_OBSERVABLE]('x'), subscr).toBe(result, values);

    flush();

    assert.equal(rx.x, 7);
  });
}

testObservable();
