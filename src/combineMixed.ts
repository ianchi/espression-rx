/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { keyedObject } from 'espression';
import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Same as `combineLatest`, but the input array can have mixed scalar and Observables.
 *
 * @param input Array of values or observables
 * @param asObservable If false and all the array is scalar, returns a scalar. Default: `true`
 */
export function combineMixed(input: any[] | keyedObject, asObservable: true): Observable<any[]>;
export function combineMixed(
  input: any[] | keyedObject,
  asObservable: boolean = true
): Observable<any[]> | any[] | object {
  if (Array.isArray(input)) {
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

  const isObs: keyedObject = {},
    observables = [];
  let pos = 0;
  for (const prop in input) {
    if (isObservable(input[prop])) {
      isObs[prop] = pos++;
      observables.push(input[prop]);
    } else isObs[prop] = false;
  }

  if (!observables.length) return asObservable ? of(input) : input;

  return combineLatest(observables).pipe(
    map(res => {
      const result: keyedObject = {};
      for (const prop in isObs) {
        result[prop] = isObs[prop] === false ? input[prop] : res[isObs[prop]];
      }
      return result;
    })
  );
}
