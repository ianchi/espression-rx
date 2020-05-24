// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../support/matchers_types.d.ts"/>

import 'jasmine';
import { isObservable } from 'rxjs';
import { testScheduler } from '../helpers/espression';
import { toBeObservableMatcher } from '../helpers/observable';
import { RxObject } from '../../src/main';
import { tap } from 'rxjs/operators';

const evaluate: (expr: string, context: any) => any = (global as any).espression.evaluate;

describe('Scalar Lvalues and Rx Rvalue', () => {
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
  it('should assign the RxObject', () => {
    testScheduler().run(({ cold }) => {
      const expr = 'a = rx';
      const object = '-1-2-3-|';

      const context = { a: cold('----|'), b: 5, o: cold(object, values), rx: RxObject({ x: 1 }) };
      const e1 = evaluate(expr, context);

      expect(e1).toBe(context.rx);
    });
  });

  it('should assign the property as Observable', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = 'a = rx.x';
      const proxym = '-1-2-3-|';
      const result = '01-2-3-';
      const subscr = '^------!';

      const rx: { x: any } = RxObject({ x: 0 });
      const proxy$ = cold(proxym, values).pipe(tap(v => (rx.x = v)));
      const context = { a: 1, b: 5, rx };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      expectObservable(proxy$).toBe(proxym, values);
      if (isObservable(e1)) expectObservable(e1, subscr).toBe(result, values);
    });
  });

  it('should assign the property as Observable of the inner nested RxObject', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = 'a = rx.rx.x';
      const proxy1 = '-0-1|';
      const proxy2 = '---1----2-3-|';
      const result = '9--(51)-2-3-';
      const subscr = '^-----------!';

      const rx2: { x: any } = RxObject({ x: 5 });
      const rx1: { rx: any } = RxObject({ rx: { x: 9 } });

      // assignment of 0 to rx1.rx.x won't be emitted because at first, inner rx is not reactive
      const proxy1$ = cold(proxy1, values).pipe(tap(v => (v ? (rx1.rx = rx2) : (rx1.rx.x = 0))));
      const proxy2$ = cold(proxy2, values).pipe(tap(v => (rx2.x = v)));

      const context = { a: 1, b: 5, rx: rx1 };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      expectObservable(proxy1$).toBe(proxy1, values);
      expectObservable(proxy2$).toBe(proxy2, values);
      if (isObservable(e1)) expectObservable(e1, subscr).toBe(result, values);
    });
  });
});
