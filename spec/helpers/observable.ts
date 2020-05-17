import { isObservable } from 'rxjs';

export const toBeObservableMatcher: jasmine.CustomMatcherFactories = {
  toBeObservable(
    _util: jasmine.MatchersUtil,
    _customEqualityTesters: readonly jasmine.CustomEqualityTester[]
  ): jasmine.CustomMatcher {
    return {
      compare(actual: any, ...params: any[]): jasmine.CustomMatcherResult {
        const pass = isObservable(actual);
        return {
          pass,
          message: `Expected ${params?.[0] ?? ''} ${pass ? 'not to' : 'to'} be Observable`,
        };
      },
    };
  },
};
