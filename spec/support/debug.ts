/*!
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { ESnextParser } from 'espression';
import { isObservable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

import { reactiveEvalFactory } from '../../src/reactive';

const rx = reactiveEvalFactory();
const parser = new ESnextParser(true, undefined, undefined, false);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const variableDiff = require('variable-diff'); // eslint-disable-line @typescript-eslint/no-var-requires

export function* makeIterator() {
  yield 1;
  yield 2;
}

function testObservable() {
  const testScheduler = new TestScheduler((actual, expected) => {
    const diff = variableDiff(expected, actual);

    if (diff.changed) {
      console.log(diff.text);
    } else console.log('Test OK');
  });

  testScheduler.run(helpers => {
    const { expectObservable, cold } = helpers;
    const expr = 'a + o';
    const source = '1-2-3|';
    const result = '2-3-4|';
    const expectedValues = { 1: 1, 2: 2, 3: 3, 4: 4 };
    const context = { x: 1, o: cold(source, expectedValues) };
    const e1 = rx.evaluate(parser.parse(expr), context);

    if (isObservable(e1)) {
      expectObservable(e1).toBe(result, expectedValues);
    }
  });
}

testObservable();
