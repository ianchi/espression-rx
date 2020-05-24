// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../support/matchers_types.d.ts"/>

import 'jasmine';
import { isObservable } from 'rxjs';
import { testScheduler } from '../helpers/espression';
import { toBeObservableMatcher } from '../helpers/observable';
import { RxObject, IRxProperties, GET_OBSERVABLE } from '../../src/main';
import { tap } from 'rxjs/operators';

const evaluate: (expr: string, context: any) => any = (global as any).espression.evaluate;

describe('Rx Object as Lvalues', () => {
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
    T: true,
    F: false,
  };

  beforeEach(() => jasmine.addMatchers(toBeObservableMatcher));
  it('should assign a new value overwriting RxObject', () => {
    testScheduler().run(() => {
      const expr = 'rx = 12';

      const context = { rx: RxObject({ x: 1 }) };
      const e1 = evaluate(expr, context);

      expect(e1).toBe(12);
    });
  });

  it('should assign the value to the property and emit', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = 'rx.x = 9';
      const proxy1 = '---1|';
      const result = '0--9--';
      const subscr = '^------!';

      const rx: IRxProperties<{ x: number }> = RxObject({ x: 0 });
      const context = { a: 1, b: 5, rx };
      const e1 = cold(proxy1, values).pipe(tap(() => evaluate(expr, context)));

      expectObservable(e1).toBe(proxy1, values);
      expectObservable(context.rx[GET_OBSERVABLE]('x'), subscr).toBe(result, values);
    });
  });

  it('should assign the values emitted by the assigned Observable', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'rx.x = o';
      const proxy1 = '--9-8-7|';
      const result = '5-9-8-7-';
      const subscr = '^-----------!';

      const rx = RxObject({ x: 5 });

      const context = { a: 1, b: 5, rx, o: cold(proxy1, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      if (isObservable(e1)) expectObservable(e1).toBe(proxy1, values);
      expectObservable(rx[GET_OBSERVABLE]('x'), subscr).toBe(result, values);

      flush();

      expect(rx.x).toBe(7);
    });
  });

  it('should change to follow new Observable on reassignment', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'rx.x = o1 , o1  && (rx.x = o2)';
      const inner1 = '--0-9-|';
      const inner2 = '    3----4-5-|';
      const rxobjt = '5-0-(93)-4-5';
      const result = '--0-(03)-4-5-|';
      const subscr = '^-----------!';

      const rx = RxObject({ x: 5 });

      const context = { a: 1, b: 5, rx, o1: cold(inner1, values), o2: cold(inner2, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      expectObservable(e1).toBe(result, values);
      expectObservable(rx[GET_OBSERVABLE]('x'), subscr).toBe(rxobjt, values);

      flush();

      expect(rx.x).toBe(5);
    });
  });

  it('should stop broadcasting previous Observable on reassignment', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'rx.x = o1 , rx.x = o2';
      const inner1 = '-0-1-2-3|';
      const inner2 = '--9-8-7-|';
      const rxobjt = '5-9-8-7--';
      const result = '--998877|';
      const subscr = '^-----------!';

      const rx = RxObject({ x: 5 });

      const context = { a: 1, b: 5, rx, o1: cold(inner1, values), o2: cold(inner2, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('expr result');

      expectObservable(e1).toBe(result, values);
      expectObservable(rx[GET_OBSERVABLE]('x'), subscr).toBe(rxobjt, values);

      flush();

      expect(rx.x).toBe(7);
    });
  });
});
