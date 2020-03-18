/*!
 * Copyright (c) 2020 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { ESnextParser } from 'espression';
import { from, isObservable, timer } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

import { reactiveEvalFactory } from '../src/reactive';

const rx = reactiveEvalFactory();
const parser = new ESnextParser(true, undefined, undefined, false);
let done = false;

const expr = '(({a:{x,z},b:y=t, ...r})=> [x,z,y,r])({...c})';
const context = {
  c: timer(0, 100).pipe(
    take(2),
    map(
      n =>
        [
          { a: { x: 10, z: 20 }, C: 3 },
          { a: { x: 'ab', z: 'c' }, b: 'de', C: 'fgh' },
        ][n]
    ),
    tap(e => console.log('c:', JSON.stringify(e, null, 0)))
  ),
  t: from([1, 2, 3, 4, 5]).pipe(tap(e => console.log('t:', e))),
  tt: timer(100, 100)
    .pipe(take(5))
    .pipe(tap(e => console.log('tt:', e))),
};

const ast = parser.parse(expr);
const res = rx.evaluate(ast, context);

if (isObservable(res)) {
  res.subscribe(
    r => console.log('Res', JSON.stringify(r, null, 0)),
    e => (console.error('Error', e), (done = true)),
    () => (console.log('Complete'), (done = true))
  );
} else console.log(res);
console.log('end');

(function wait(): void {
  // As long as it's nor marked as done, create a new event+queue
  if (!done) setTimeout(wait, 1000);

  // No return value; done will resolve to false (undefined)
})();
