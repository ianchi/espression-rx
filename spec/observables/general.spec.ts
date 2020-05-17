import 'jasmine';
import { isObservable } from 'rxjs';
import { testScheduler } from '../helpers/espression';

const evaluate: (expr: string, context: any) => any = (global as any).espression.evaluate;

describe('Basic Numeric operations on observables', () => {
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
  it('should return observable of sums with one operand', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const context = { a: 1, o: cold('1-2-3|', values) };
      const e1 = evaluate('a + o', context);
      const expected = '2-3-4|';

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(expected, values);
    });
  });

  it('should return observable of sums with two operands', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const origin = '  -1-2----3---|';
      const expected = '-2-(34)-(5 6)|';
      const context = { a: 1, o: cold(origin, values) };
      const e1 = evaluate('o + o', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(expected, values);
    });
  });

  it('should return observable computed member expression', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const source = '-0-1-2|';
      const result = '-5-6-7|';
      const context = { a: [5, 6, 7], o: cold(source, values) };
      const e1 = evaluate('a[o]', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(result, values);
    });
  });

  it('should return observable object with computed member expression, side effect only once + error', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const object = '-o--pqr--|';
      const result = '-0--12#';

      const context = { a: 1, o: cold(object, values) };
      const e1 = evaluate('o[a++]', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1))
        expectObservable(e1).toBe(
          result,
          { 0: 'o1', 1: 'p1', 2: 'q1' },
          new TypeError("Cannot read property '1' of undefined")
        );
      flush();
      expect(context.a).toBe(2);
    });
  });

  it('should shortcircuit evaluation of computed member expression, side effect always', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const object = '-o--pqr--|';
      const result = '-0--123--|';

      const context = { a: 1, o: cold(object, values) };
      const e1 = evaluate('o?.[a++]', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1))
        expectObservable(e1).toBe(result, { 0: 'o1', 1: 'p2', 2: 'q3', 3: undefined });

      // make sure to finish stream before testing side effect
      flush();
      expect(context.a).toBe(4);
    });
  });
  it('should return observable object with observable computed member expression', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const object = '-o--pq---|';
      const member = '-1-2-3---|';
      const result = '-0-12(34)|';

      const context = { a: 1, o: cold(object, values), m: cold(member, values) };
      const e1 = evaluate('o[m]', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1))
        expectObservable(e1).toBe(result, { 0: 'o1', 1: 'o2', 2: 'p2', 3: 'q2', 4: 'q3' });
    });
  });

  it('should shortcircuit evaluation of logical AND expression, side effect only on true with reevaluation', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const object = '-0--0-5-5--|';
      const result = '-0--0-1-2--|';

      const context = { a: 1, o: cold(object, values) };
      const e1 = evaluate('o  && a++', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      // make sure to finish stream before testing side effect
      flush();
      expect(context.a).toBe(3);
    });
  });

  it('should shortcircuit evaluation of logical expression, resuscribe on true ', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const object = '-0--0-5-5-----6--|';
      const inner = '1-2';
      const result = '-0--0-1-1-2---1-2';

      const context = { a: 1, o: cold(object, values), i: cold(inner, values) };
      const e1 = evaluate('o && i', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(result, values);
    });
  });

  it('should shortcircuit evaluation of conditional expression, side effect only on reevaluation', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const object = '-0--0-5-5--|';
      const result = '-5--6-1-2--|';

      const context = { a: 1, b: 5, o: cold(object, values) };
      const e1 = evaluate('o  ? a++ : b++', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(result, values);

      // make sure to finish stream before testing side effect
      flush();
      expect(context.a).toBe(3);
      expect(context.b).toBe(7);
    });
  });

  it('should shortcircuit evaluation of conditional expression, resuscribe on true ', () => {
    testScheduler().run(({ expectObservable, cold }) => {
      const object = '-0--0-5-5-----6--|';
      const i_true = '1-2';
      const i_flse = 'a-b';
      const result = '-a-ba-1-1-2---1-2';

      const context = {
        a: 1,
        o: cold(object, values),
        t: cold(i_true, values),
        f: cold(i_flse, values),
      };
      const e1 = evaluate('o ? t : f', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(result, values);
    });
  });

  it('should evaluate call expression, side effects on parameters only on initial evaluation', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const object = '-1-2-3--|';
      const result = '-a-b-c--|';

      const context = { a: 1, b: 5, o: cold(object, values), f: (...p: any) => p };
      const e1 = evaluate('f(o , a++)', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1)) expectObservable(e1).toBe(result, { a: [1, 1], b: [2, 1], c: [3, 1] });

      // make sure to finish stream before testing side effect
      flush();
      expect(context.a).toBe(2);
    });
  });

  it('should evaluate call expression, side effects on parameters only on initial evaluation, even on newly emited function', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      const object = '-0--1----2--|';
      const result = '-a--(bc)-#';

      const context = {
        a: 1,
        b: 5,
        o: cold(object, values),
        f: [(...p: any) => [1, p], (...p: any) => [2, p]],
      };
      const e1 = evaluate('f[o](o , a++)', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1))
        expectObservable(e1).toBe(
          result,
          { a: [1, [0, 1]], b: [2, [0, 1]], c: [2, [1, 1]] },
          new TypeError("Cannot read property 'apply' of undefined")
        );

      // make sure to finish stream before testing side effect
      flush();
      expect(context.a).toBe(2);
    });
  });

  it('should evaluate call expression, side effects on parameters on every shortcircuited value', () => {
    testScheduler().run(({ expectObservable, cold, flush }) => {
      // ⚠️an external observable referenced in two places is not shared
      // it is subscribed independently on each side, so the same variable references two different streams!!
      const object = '-0--1----2--|';
      const result = '--a--b--cu--|';

      const context = {
        a: 1,
        b: 5,
        o: cold(object, values),
        f: [(...p: any) => [1, p], (...p: any) => [2, p]],
      };
      const e1 = evaluate('f[o]?.(o , a++)', context);

      expect(isObservable(e1)).toBeTrue();

      if (isObservable(e1))
        expectObservable(e1).toBe(
          result,
          { a: [1, [0, 1]], b: [2, [0, 2]], c: [2, [1, 2]], u: undefined },
          new TypeError("Cannot read property 'apply' of undefined")
        );

      // make sure to finish stream before testing side effect
      flush();
      expect(context.a).toBe(3);
    });
  });
});
