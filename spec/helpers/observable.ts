/**
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { isObservable } from 'rxjs';

export const toBeObservableMatcher: jasmine.CustomMatcherFactories = {
  toBeObservable(
    _util: jasmine.MatchersUtil,
    _customEqualityTesters: readonly jasmine.CustomEqualityTester[]
  ): jasmine.CustomMatcher {
    return {
      compare<T>(actual: T, ...params: any[]): jasmine.CustomMatcherResult {
        const pass = isObservable(actual);
        return {
          pass,
          message: `Expected ${(params?.[0] as string) ?? ''} ${
            pass ? 'not to' : 'to'
          } be Observable`,
        };
      },
    };
  },
};
