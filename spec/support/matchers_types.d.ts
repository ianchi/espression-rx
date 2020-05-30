/** 
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */
declare namespace jasmine {
  interface Matchers<T> {
    toBeObservable(expectationFailOutput?: string): boolean;
  }
}
