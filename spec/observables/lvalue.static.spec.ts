/**
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference, spaced-comment
/// <reference path="../support/matchers_types.d.ts"/>

import 'jasmine';
import { isObservable } from 'rxjs';

import { testScheduler } from '../helpers/espression';
import { toBeObservableMatcher } from '../helpers/observable';

const evaluate: (expr: string, context: any) => any = (global as any).espression.evaluate;

describe('Scalar Lvalues and observable Rvalue', () => {
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
  it('should assign the observable', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'a = o';
      const object = '-1-2-3-|';
      const result = '-1-2-3-|';

      const context = { a: 1, b: 5, o: cold(object, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.a).toBeObservable('lvalue result');
    });
  });

  it('should assign the observable of the result', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'a = a + o';
      const object = '-1-2-3-|';
      const result = '-2-3-4-|';

      const context = { a: 1, b: 5, o: cold(object, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.a).toBeObservable('lvalue result');
    });
  });

  it('should update the scalar lvalue with compound assignment on each emission', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = 'a += o';
      const object = '-1-2-3-|';
      const result = '-2-4-7-|';

      const context = { a: 1, b: 5, o: cold(object, values) };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.a).toBe(7);
    });
  });

  it('should assign the observable of the destructured array to variables and return the assigned observable', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = '[a, b] = arr[o] ';
      const object = '-0-1-2-|';
      const result = '-a-b-c-|';

      const context = {
        a: 1,
        b: 5,
        o: cold(object, values),
        arr: [
          [9, 8, 7],
          [5, 4, 3],
          [2, 1, 0],
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1))
        expectObservable(e1).toBe(result, { a: [9, 8, 7], b: [5, 4, 3], c: [2, 1, 0] });

      flush();
      expect(context.a).toBeObservable('context.a');
      expect(context.b).toBeObservable('context.b');
    });
  });

  it('should assign the observable of the destructured array to variables and should emit the corresponding element', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = '[a, b] = arr[o] , a';
      const object = '-0-1----2---|';
      const result = '-9-(95)-(52)|';

      const context = {
        a: 1,
        b: 5,
        o: cold(object, values),
        arr: [
          [9, 8, 7],
          [5, 4, 3],
          [2, 1, 0],
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);
    });
  });

  it('should assign the observable of the destructured array to variables and should evaluate default on undefined', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = '[a, b, c= x++] = arr[o], c';
      const object = '-0-1----2---|';
      const result = '-0-(03)-(31)|';

      const context = {
        a: 1,
        b: 5,
        c: 0,
        x: 0,
        o: cold(object, values),
        arr: [
          [9, 8],
          [5, 4, 3],
          [2, 1],
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.x).toBe(2);
      expect(context.c).toBeObservable('context.c');
    });
  });

  it('should assign the observable of the destructured array to variables and should evaluate default on undefined even if not referenced', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = '[a, b, c= x++] = arr[o], b';
      const object = '-0-1----2---|';
      const result = '-8-(84)-(41)|';

      const context = {
        a: 1,
        b: 5,
        c: 0,
        x: 0,
        o: cold(object, values),
        arr: [
          [9, 8],
          [5, 4, 3],
          [2, 1],
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.x).toBe(2);
      expect(context.c).toBeObservable('context.c');
    });
  });

  it('should assign the observable of the destructured object to variables and return the assigned observable', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = '{a, b} = arr[o] ';
      const object = '-0-1-2-|';
      const result = '-a-b-c-|';

      const context = {
        a: 1,
        b: 5,
        o: cold(object, values),
        arr: [
          { a: 9, b: 8, c: 7 },
          { a: 5, b: 4, c: 3 },
          { a: 2, b: 1, c: 0 },
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1))
        expectObservable(e1).toBe(result, {
          a: { a: 9, b: 8, c: 7 },
          b: { a: 5, b: 4, c: 3 },
          c: { a: 2, b: 1, c: 0 },
        });

      flush();
      expect(context.a).toBeObservable('context.a');
      expect(context.b).toBeObservable('context.b');
    });
  });

  it('should assign the observable of the destructured object to variables and should emit the corresponding element', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const expr = '{a, b} = arr[o] , a';
      const object = '-0-1----2---|';
      const result = '-9-(95)-(52)|';

      const context = {
        a: 1,
        b: 5,
        o: cold(object, values),
        arr: [
          { a: 9, b: 8, c: 7 },
          { a: 5, b: 4, c: 3 },
          { a: 2, b: 1, c: 0 },
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);
    });
  });

  it('should assign the observable of the destructured object to variables and should evaluate default on undefined', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = '{a, b, c= x++} = arr[o], c';
      const object = '-0-1----2---|';
      const result = '-0-(03)-(31)|';

      const context = {
        a: 1,
        b: 5,
        c: 0,
        x: 0,
        o: cold(object, values),
        arr: [
          { a: 9, b: 8 },
          { a: 5, b: 4, c: 3 },
          { a: 2, b: 1 },
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.x).toBe(2);
      expect(context.c).toBeObservable('context.c');
    });
  });

  it('should assign the observable of the destructured object to variables and should evaluate default on undefined even if not referenced', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const expr = '{a, b, c= x++} = arr[o], b';
      const object = '-0-1----2---|';
      const result = '-8-(84)-(41)|';

      const context = {
        a: 1,
        b: 5,
        c: 0,
        x: 0,
        o: cold(object, values),
        arr: [
          { a: 9, b: 8 },
          { a: 5, b: 4, c: 3 },
          { a: 2, b: 1 },
        ],
      };
      const e1 = evaluate(expr, context);

      expect(e1).toBeObservable('eval result');
      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      flush();
      expect(context.x).toBe(2);
      expect(context.c).toBeObservable('context.c');
    });
  });
});
