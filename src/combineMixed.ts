/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Same as `combineLatest`, but the input array can have mixed scalar and Observables.
 *
 * @param input Array of values or observables
 * @param asObservable If false and all the array is scalar, returns a scalar. Default: `true`
 */
export function combineMixed(input: any[], asObservable: true): Observable<any[]>;
export function combineMixed(input: any[], asObservable: false): Observable<any[]> | any[];
export function combineMixed(input: any[], asObservable = true): Observable<any[]> | any[] {
  if (!Array.isArray(input)) throw new Error('Input must be an array');
  let pos = 0;
  const isObs: Array<number | false> = [],
    hasObs = input.reduce(
      (acum, val, i) => (isObs[i] = isObservable(val) && pos++) !== false || acum,
      false
    ); // tslint:disable-line:no-conditional-assignment

  if (!hasObs) return asObservable ? of(input) : input;

  return combineLatest(input.filter((_val, index) => isObs[index] !== false)).pipe(
    map(result => isObs.map((o, i) => (o === false ? input[i] : result[o])))
  );
}
