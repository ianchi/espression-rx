/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
  ARRAY_PAT,
  assignOpCB,
  ES6StaticEval,
  ILvalue,
  INode,
  keyedObject,
  LITERAL_EXP,
  OBJECT_PAT,
  RESOLVE_MEMBER,
  RESOLVE_SHORT_CIRCUITED,
  REST_ELE,
  unsuportedError,
  preUpdateOpCB,
  postUpdateOpCB,
  UPDATE_EXP,
} from 'espression';
import { from, isObservable, Observable, of, merge } from 'rxjs';
import { map, share, shareReplay, switchMap, take, ignoreElements } from 'rxjs/operators';

import { combineMixed } from './combineMixed';
import { AS_OBSERVABLE, GET_OBSERVABLE, isReactive, SET_OBSERVABLE } from './rxobject';

/**
 * Extends ES5 StaticEval to perform reactive evaluation of expressions having Observable values.
 * It returns an Observable which emits a new result when any dependent member emits a new value
 */
export class ReactiveEval extends ES6StaticEval {
  lvalue(node: INode, context: object, unresolved?: boolean): ILvalue {
    const result = super.lvalue(node, context);

    // allow observable as lvalue only if it can be immediately resolved at the moment of evaluation
    // this freezes the lvalue to only ONE evaluation, and no reaction to later changes

    return unresolved ? result : immediateResolve(result);
  }

  _assignPattern(
    node: INode,
    operator: string,
    right: any,
    context: any,
    defaultsContext?: any
  ): any {
    const rx = isObservable(right);
    let combined: any[] | Observable<any[]> = [];
    switch (node.type) {
      case ARRAY_PAT:
        if (operator !== '=') throw new TypeError('Invalid left-hand side in assignment');
        right = mapMixed(right, (r: any) => {
          if (!r || typeof r[Symbol.iterator] !== 'function')
            throw new Error('TypeError: must be iterable');
          return r;
        });

        // share the same observable result for all array elements
        // RxObjects are listened to (and shared by default)
        if (rx) right = right.pipe(share());
        else if (isReactive(right)) right = right[AS_OBSERVABLE]();

        for (let i = 0; i < node.elements.length; i++) {
          if (!node.elements[i]) continue;
          const rest = node.elements[i].type === REST_ELE;

          combined.push(
            this._assignPattern(
              rest ? node.elements[i].argument : node.elements[i],
              operator,
              mapMixed(right, v => (rest ? iterSlice : iterAt)(v, i)),
              context,
              defaultsContext
            )
          );
        }

        // merge without values, just to propagate subscription, even if it is never referenced.
        combined = combineMixed(combined, false);
        if (isObservable(combined)) right = merge(right, combined.pipe(ignoreElements()));

        break;

      case OBJECT_PAT:
        if (operator !== '=') throw new SyntaxError('Invalid left-hand side in assignment');
        right = mapMixed(right, (r: any) => {
          if (r === null || typeof r === 'undefined')
            throw new Error('TypeError: must be convertible to object');
          return r;
        });

        // share the same observable result for all array elements
        // RxObjects are listened to (and shared by default)
        if (rx) right = right.pipe(share());
        else if (isReactive(right)) right = right[AS_OBSERVABLE]();

        const visited: any = {};

        for (let i = 0; i < node.properties.length; i++) {
          const rest = node.properties[i].type === REST_ELE;
          let key: string;
          if (!rest)
            key = node.properties[i].computed
              ? immediateResolve(this._eval(node.properties[i].key, context))
              : node.properties[i].key.type === LITERAL_EXP
              ? node.properties[i].key.value
              : node.properties[i].key.name;

          combined.push(
            this._assignPattern(
              rest ? node.properties[i].argument : node.properties[i].value,
              operator,
              mapMixed(right, (r: any) => {
                if (rest)
                  return Object.keys(r)
                    .filter(k => !(k in visited))
                    .reduce((rst: any, k) => ((rst[k] = r[k]), rst), {});
                visited[key!] = true;
                return r[key!];
              }),
              context,
              defaultsContext
            )
          );
        }

        // merge without values, just to propagate subscription, even if it is never referenced.
        combined = combineMixed(combined, false);
        if (isObservable(combined)) right = merge(right, combined.pipe(ignoreElements()));

        break;

      case 'AssignmentPattern':
        // only assign default if the value being assigned is `undefined`
        right = switchMixed(right, r =>
          typeof r === 'undefined' ? this._eval(node.right, defaultsContext ?? context) : r
        );

        return this._assignPattern(node.left, operator, right, context);

      default:
        const left = this.lvalue(node, context);
        // if lvalue is reactive don't assign an observable, but the resolved value
        // the reactive object will emit anyway the resolved value
        if (isReactive(left.o) && rx)
          return (left.o as any)[SET_OBSERVABLE](left.m, right, assignOpCB[operator]);
        else if (isObservable(left.o[left.m]) && operator !== '=')
          throw new TypeError('Cannot update observable value');

        // if it is a simple variable allow to assign the observable, to be used as alias
        // otherwise until the value is resolved the lvalue won't see the assignment if used in
        // other expression
        if (rx && operator === '=')
          return assignOpCB[operator](
            left.o,
            left.m,
            right.pipe(shareReplay({ bufferSize: 1, refCount: true }))
          );

        return mapMixed(right, r => assignOpCB[operator](left.o, left.m, r));
    }

    return right;
  }

  /** Rule to evaluate `MemberExpression` */
  protected MemberExpression(node: INode, context: keyedObject): any {
    return this._member(
      node,
      context,
      val => val && (isReactive(val.o) ? val.o[GET_OBSERVABLE](val.m) : val.o[val.m])
    );
  }

  protected ArrowFunctionExpression(node: INode, context: keyedObject): any {
    const es6Func = super.ArrowFunctionExpression(node, context);

    return (...params: any[]) => {
      return immediateResolve(
        es6Func(...params),
        'Returning unresolved observable from arrow function expression'
      );
    };
  }

  protected UpdateExpression(node: INode, context: keyedObject): any {
    const cb = node.prefix ? preUpdateOpCB : postUpdateOpCB;
    if (!(node.operator in cb)) throw unsuportedError(UPDATE_EXP, node.operator);
    const left = this.lvalue(node.argument, context);
    if (isObservable(left.o[left.m])) throw new TypeError('Cannot update observable value');

    return cb[node.operator](left.o, left.m);
  }
  protected _resolve(
    context: object,
    mode: number,
    operatorCB: (...args: any[]) => any,
    ...operands: INode[]
  ): any {
    // Resolve all operands, converting the result to observable if non plain scalar (RxObject or Promise)

    // eslint-disable-next-line no-bitwise
    return (mode & RESOLVE_SHORT_CIRCUITED || mode & RESOLVE_MEMBER ? switchMixed : mapMixed)(
      combineMixed(
        operands.map(
          (node: INode, i: number) =>
            (node || undefined) &&
            // eslint-disable-next-line no-bitwise
            toMixed(this._eval(node, context), mode & RESOLVE_MEMBER && i === 0)
        ),
        false
      ),
      params => operatorCB(...(params as any[]))
    );
  }
}

function immediateResolve<T>(value: Observable<T> | T, errorMessage?: string): T {
  if (!isObservable(value)) return value;

  let resolved = false;
  let result: T;
  // try to get resolved value of computed member expression
  value.pipe(take(1)).subscribe(m => {
    resolved = true;
    result = m;
  });
  if (!resolved) throw new Error(errorMessage || 'Unsersolved observable in lvalue');
  return result!;
}

export function reactiveEvalFactory(): ReactiveEval {
  return new ReactiveEval();
}

/** Return the element at specified position of an iterable */
function iterAt(iter: Iterable<any>, at: number): any {
  let n = 0;

  for (const e of iter) if (n++ === at) return e;

  return undefined;
}

/** Return an array with a slice of an iterable, starting at element `start` */
function iterSlice(iter: Iterable<any>, start: number): any[] {
  let n = 0;
  const res = [];

  for (const e of iter) if (n++ >= start) res.push(e);

  return res;
}

/** Convert value to observable accordingly to the type of input */
export function toObservable<T>(value: Observable<T> | Promise<T> | T): Observable<T> {
  if (isObservable(value)) return value;
  if (value instanceof Promise) return from(value);
  return of(value);
}

/**
 * Converts promise or RxObject to Observable, leaves scalars as is
 * Optionally treat RxObject as scalar, and pass it thru
 */
export function toMixed<T>(
  value: Observable<T> | Promise<T> | T,
  reactiveAsScalar?: boolean | 0 | 1
): Observable<T> | T {
  if (typeof value !== 'object' || isObservable(value)) return value;
  if (value instanceof Promise) return from(value);
  if (!reactiveAsScalar && isReactive(value)) return value[AS_OBSERVABLE]();
  return value;
}

function mapMixed<T, O>(value: Observable<T>, project: (v: T) => O): Observable<O>;
function mapMixed<T, O>(value: T, project: (v: T) => O): O;
function mapMixed<T, O>(value: T | Observable<T>, project: (v: T) => O): O | Observable<O> {
  return isObservable(value) ? value.pipe(map(project)) : project(value);
}

function switchMixed<T, O>(value: Observable<T>, project: (v: T) => O): Observable<O>;
function switchMixed<T, O>(value: T, project: (v: T) => O): O;
function switchMixed<T, O>(value: T | Observable<T>, project: (v: T) => O): O | Observable<O> {
  return isObservable(value)
    ? value.pipe(switchMap(v => toObservable(project(v))))
    : project(value);
}
