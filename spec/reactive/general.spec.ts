// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../support/matchers_types.d.ts"/>

import 'jasmine';
import { isObservable } from 'rxjs';
import { testScheduler } from '../helpers/espression';
import { toBeObservableMatcher } from '../helpers/observable';
import { RxObject } from '../../src/main';
import { tap } from 'rxjs/operators';

const evaluate: (expr: string, context: any) => any = (global as any).espression.evaluate;

describe('Use of Rx Rvalue as operand', () => {
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

  beforeEach(() => jasmine.addMatchers(toBeObservableMatcher));

  it('should return observable that emits on mutation of the RxObject', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = '[...rx]';
      const proxy1 = '---0-1|';
      const result = 'a--b-c';
      const subscr = '^------!';

      const rx: any[] = RxObject([10, 20]);

      const proxy$ = cold(proxy1, values).pipe(tap(v => rx.push(v)));

      const context = { a: 1, b: 5, rx };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      expectObservable(proxy$).toBe(proxy1, values);
      if (isObservable(e1))
        expectObservable(e1, subscr).toBe(result, {
          a: [10, 20],
          b: [10, 20, 0],
          c: [10, 20, 0, 1],
        });
    });
  });

  it('should return observable that emits on changing the object property', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = 'rx[a]';
      const marble = '-0-1-|';
      const proxy1 = '-----0-1|';
      const result = '-9-8-0-1';
      const subscr = '^--------!';

      const rx: any[] = RxObject([9, 8]);

      const context = { a: cold(marble, values), b: 5, rx };
      const proxy$ = cold(proxy1, values).pipe(tap(v => (rx[1] = v)));

      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      expectObservable(proxy$).toBe(proxy1, values);
      if (isObservable(e1)) expectObservable(e1, subscr).toBe(result, values);
    });
  });
});
