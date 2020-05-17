// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../support/matchers_types.d.ts"/>

import 'jasmine';
import { isObservable } from 'rxjs';
import { testScheduler } from '../helpers/espression';
import { toBeObservableMatcher } from '../helpers/observable';

const evaluate: (expr: string, context: any) => any = (global as any).espression.evaluate;

describe('Observable Lvalues and any Rvalue', () => {
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
  it('should assign a new observable', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'a = o';
      const object = '-1-2-3-|';
      const result = '-1-2-3-|';

      const context = { a: cold('----|'), b: 5, o: cold(object, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.a).toBeObservable('lvalue result');
      expect(context.a).toBe(e1);
    });
  });

  it('should fail on compound assign', () => {
    testScheduler().run(({ cold }) => {
      const expr = 'o += 1';
      const object = '-1-2-3-|';

      const context = { a: 1, b: 5, o: cold(object, values) };
      expect(() => evaluate(expr, context)).toThrowError();
    });
  });

  it('should fail on update', () => {
    testScheduler().run(({ cold }) => {
      const expr = 'o++';
      const object = '-1-2-3-|';

      const context = { a: 1, b: 5, o: cold(object, values) };
      expect(() => evaluate(expr, context)).toThrowError();
    });
  });
});
