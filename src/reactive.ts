/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
  ARRAY_PAT,
  assignOpCB,
  BINARY_EXP,
  ES6StaticEval,
  ILvalue,
  INode,
  keyedObject,
  LITERAL_EXP,
  MEMBER_EXP,
  OBJECT_PAT,
  REST_ELE,
  unsuportedError,
} from 'espression';
import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { map, share, shareReplay, switchMap, take } from 'rxjs/operators';

import { AS_OBSERVABLE, GET_OBSERVABLE, isReactive } from './rxobject';

/**
 * Extends ES5 StaticEval to perform reactive evaluation of expressions having Observable values.
 * It returns an Observable which emits a new result when any dependent member emits a new value
 */
export class ReactiveEval extends ES6StaticEval {
  lvalue(node: INode, context: object): ILvalue {
    const result = super.lvalue(node, context);
    if (isObservable(result.o)) throw new Error('Left side object cannot be an observable.');

    if (isObservable(result.m)) {
      let resolved = false;

      // try to get resolved value of computed member expression
      result.m.pipe(take(1)).subscribe((m: any) => {
        resolved = true;
        result.m = m;
      });

      if (!resolved)
        throw new Error('Computed member expression in lvalue is not resolved observable');
    }

    return result;
  }

  _assignPattern(node: INode, operator: string, right: any, context: any): any {
    const rx = isObservable(right);

    switch (node.type) {
      case ARRAY_PAT:
        if (rx) {
          right = right.pipe(
            map((r: any) => {
              if (!r || typeof r[Symbol.iterator] !== 'function')
                throw new Error('TypeError: must be iterable');
              return r;
            }),
            share()
          );
        } else if (!right || typeof right[Symbol.iterator] !== 'function')
          throw new Error('TypeError: must be iterable');

        for (let i = 0; i < node.elements.length; i++) {
          let subnode: INode, func: (n: Iterable<any>, i: number) => any;

          if (!node.elements[i]) continue;

          if (node.elements[i].type === REST_ELE) {
            subnode = node.elements[i].argument;
            func = iterSlice;
          } else {
            subnode = node.elements[i];
            func = iterAt;
          }

          this._assignPattern(
            subnode,
            operator,
            rx ? right.pipe(map((r: Iterable<any>) => func(r, i))) : func(right, i),
            context
          );
        }

        break;

      case OBJECT_PAT:
        if (rx) {
          right = right.pipe(
            map((r: any) => {
              if (r === null || typeof r === 'undefined')
                throw new Error('TypeError: must be convertible to object');
              return r;
            }),
            share()
          );
        } else if (right === null || typeof right === 'undefined')
          throw new Error('TypeError: must be convertible to object');

        const visited: any = {};

        for (let i = 0; i < node.properties.length; i++) {
          if (node.properties[i].type === REST_ELE) {
            this._assignPattern(
              node.properties[i].argument,
              operator,
              rx
                ? right.pipe(
                    map((r: any) =>
                      Object.keys(r)
                        .filter(k => !(k in visited))
                        .reduce((rst: any, k) => ((rst[k] = r[k]), rst), {})
                    )
                  )
                : Object.keys(right)
                    .filter(k => !(k in visited))
                    .reduce((rst: any, k) => ((rst[k] = right[k]), rst), {}),
              context
            );
          } else {
            let key: string;

            if (node.properties[i].computed) {
              const computed = this._eval(node.properties[i].key, context);

              if (isObservable(computed)) {
                let resolved = false;

                // try to get resolved value of computed member expression
                computed.pipe(take(1)).subscribe((m: any) => {
                  resolved = true;
                  key = m;
                });

                if (!resolved)
                  throw new Error(
                    'Computed member expression in lvalue is not resolved observable'
                  );
              } else key = computed;
            } else
              key =
                node.properties[i].key.type === LITERAL_EXP
                  ? node.properties[i].key.value
                  : node.properties[i].key.name;

            visited[key!] = true;
            this._assignPattern(
              node.properties[i].value,
              operator,
              rx ? right.pipe(map((r: any) => r[key!])) : right[key!],
              context
            );
          }
        }

        break;

      case 'AssignmentPattern':
        if (typeof right === 'undefined') right = this._eval(node.right, context);
        else if (isObservable(right))
          right = right.pipe(
            switchMap((r: any) => {
              if (typeof r === 'undefined') r = this._eval(node.right, context);

              return isObservable(r) ? r : of(r);
            })
          );

        return this._assignPattern(node.left, operator, right, context);

      default:
        const left = this.lvalue(node, context);
        // if lvalue is reactive don't assign potencially an observable, but the resolved value
        // the reactive object will emit anyway the resolved value
        if (isReactive(left.o) && rx)
          return right.pipe(map(val => assignOpCB[operator](left.o, left.m, val)));

        // if it is a simple variable allow to assign the observable, to be used as alias
        // otherwise until the value is resolved the lvalue won't see the assignment if used in
        // other expression
        if (rx) right = right.pipe(shareReplay({ bufferSize: 1, refCount: true }));

        return assignOpCB[operator](left.o, left.m, right);
    }

    return right;
  }

  /** Rule to evaluate `MemberExpression` */
  protected MemberExpression(node: INode, context: object): any {
    const member = this._member(node, context);

    return isObservable(member) ? member.pipe(map((v: any) => v.value)) : member.value;
  }

  /**
   * Returns a left side value wrapped to be used for assignment
   */

  protected _member(node: INode, context: keyedObject): any {
    const obj = this._eval(node.object, context);

    if (node.optional || node.shortCircuited) {
      if (isObservable(obj))
        return obj.pipe(
          switchMap((o: any) => {
            if (o === null || typeof o === 'undefined') return of({ value: undefined });
            const member = node.computed ? this._eval(node.property, context) : node.property.name;

            return isObservable(member)
              ? member.pipe(map((m: any) => ({ obj: o, member: m, value: o[m] })))
              : of({ obj: o, member, value: o[member] });
          })
        );
      else if (!isReactive(obj)) {
        const member = node.computed ? this._eval(node.property, context) : node.property.name;
        return obj === null || typeof obj === 'undefined'
          ? { value: undefined }
          : { obj, member, value: obj[member] };
      }
    }

    // not short-circuited (or reactive, and thus not nullish)
    const member = node.computed ? this._eval(node.property, context) : node.property.name;

    if (isReactive(obj)) {
      if (isObservable(member))
        return member.pipe(
          switchMap(prop =>
            obj[GET_OBSERVABLE](prop).pipe(
              // if the assigned value is an observable, switch to it
              switchMap(res =>
                isObservable(res)
                  ? res.pipe(map(value => ({ obj, member: prop, value })))
                  : of({ obj, member: prop, value: res })
              )
            )
          )
        );

      if (isReactive(obj[member])) return { obj, member, value: obj[member] };

      return obj[GET_OBSERVABLE](member).pipe(
        // if the assigned value is an observable, switch to it
        switchMap(res =>
          isObservable(res)
            ? res.pipe(map(value => ({ obj, member, value })))
            : of({ obj, member, value: res })
        )
      );
    } else if (isObservable<any>(obj)) {
      return isObservable<any>(member)
        ? combineLatest([obj, member]).pipe(
            map(([o, m]: [keyedObject, string]) => ({ obj: o, member: m, value: o[m] }))
          )
        : obj.pipe(map((o: keyedObject) => ({ obj: o, member, value: o[member] })));
    }

    if (isObservable<any>(member))
      return member.pipe(map(prop => ({ obj, member: prop, value: obj[prop] })));

    return { obj, member, value: obj[member] };
  }

  /** Rule to evaluate `CallExpression` */
  protected CallExpression(node: INode, context: object): any {
    const funcDef:
      | { obj: object; func: () => any; args: [] }
      | Observable<{ obj: object; func: () => any; args: [] }> = this._fcall(node, context);

    if (!isObservable(funcDef))
      return !funcDef ? undefined : funcDef.func.apply(funcDef.obj, funcDef.args);

    return funcDef.pipe(
      switchMap(def => {
        if (!def) return of(undefined);
        const result = def.func.apply(def.obj, def.args);
        return isObservable(result) ? result : of(result);
      })
    );
  }

  protected ArrowFunctionExpression(node: INode, context: keyedObject): any {
    const es6Func = super.ArrowFunctionExpression(node, context);

    return (...params: any[]) => {
      const resultOrObservable = es6Func(...params);
      let resolved = false;
      let result: any;

      if (isObservable(resultOrObservable)) {
        // subscribe to see if there is synchronous result
        resultOrObservable.pipe(take(1)).subscribe(res => {
          resolved = true;
          result = res;
        });

        if (resolved) return result;

        throw new Error('Returning unresolved observable from arrow function expression');
      } else return resultOrObservable;
    };
  }
  /** Rule to evaluate `ConditionalExpression` */
  protected ConditionalExpression(node: INode, context: keyedObject): any {
    // can't resolve all operands together as it needs short circuit evaluation
    const test = this._eval(node.test, context);

    if (!isObservable(test))
      return test ? this._eval(node.consequent, context) : this._eval(node.alternate, context);

    return test.pipe(
      switchMap((t: any) => {
        const res = t ? this._eval(node.consequent, context) : this._eval(node.alternate, context);
        return isObservable(res) ? res : of(res);
      })
    );
  }

  /** Rule to evaluate `LogicalExpression` */
  protected LogicalExpression(node: INode, context: keyedObject): any {
    // can't resolve all operands together as it needs short circuit evaluation

    const test = this._eval(node.left, context);
    if (!isObservable(test))
      switch (node.operator) {
        case '||':
          return test || this._eval(node.right, context);
        case '&&':
          return test && this._eval(node.right, context);
        case '??':
          return test ?? this._eval(node.right, context);
        default:
          throw unsuportedError(BINARY_EXP, node.operator);
      }
    return test.pipe(
      switchMap((t: any) => {
        let res: any;
        switch (node.operator) {
          case '||':
            res = t || this._eval(node.right, context);
            break;
          case '&&':
            res = t && this._eval(node.right, context);
            break;
          case '??':
            res = t ?? this._eval(node.right, context);
            break;
          default:
            throw unsuportedError(BINARY_EXP, node.operator);
        }
        return isObservable(res) ? res : of(res);
      })
    );
  }
  protected _resolve(
    context: object,
    operatorCB: (...args: any[]) => any,
    ...operands: INode[]
  ): any {
    let hasObs = false;
    const isObs: number[] = [],
      results = operands.map((node, i) => {
        const res = this._eval(node, context);
        // tslint:disable-next-line:no-conditional-assignment
        if (isObservable(res)) {
          hasObs = true;
          isObs[i] = 1;
        } else if (isReactive(res)) {
          hasObs = true;
          isObs[i] = 2;
        }

        return res;
      });

    if (!hasObs) return operatorCB(...results);

    return combineLatest(
      results.map((node, i) =>
        isObs[i] === 1 ? node : isObs[i] === 2 ? node[AS_OBSERVABLE]() : of(node)
      )
    ).pipe(map(res => operatorCB(...res)));
  }

  /**
   * Returns a left side value wrapped to be used for assignment
   */

  protected _fcall(node: INode, context: keyedObject): any {
    let obj: any, func: any, member: any;
    // capture context in closure for use in callback
    // Getting it from 'this' is not reliable for async evaluation as it may have changed in later evals

    if (node.callee.type === MEMBER_EXP) {
      member = this._member(node.callee, context);

      if (isObservable<any>(member))
        return member.pipe<any>(
          switchMap(m => {
            if (
              (node.optional || node.shortCircuited) &&
              (m.value === null || typeof m.value === 'undefined')
            )
              return of(undefined);
            else {
              const res = this._resolve(
                context,
                (...args) => ({ obj: m.obj, func: m.value, args }),
                ...node.arguments
              );
              return isObservable(res) ? res : of(res);
            }
          })
        );
      else {
        obj = member.obj;
        func = member.value;
      }
    } else {
      obj = context;
      func = this._eval(node.callee, context);

      if (isObservable<any>(func)) {
        func.pipe(
          map(f =>
            (node.optional || node.shortCircuited) && (f === null || typeof f === 'undefined')
              ? of(undefined)
              : this._resolve(context, (...args) => ({ obj, func: f, args }), ...node.arguments)
          )
        );
      }
    }

    if ((node.optional || node.shortCircuited) && (func === null || typeof func === 'undefined'))
      return undefined;

    return this._resolve(context, (...args) => ({ obj, func, args }), ...node.arguments);
  }
}
export function reactiveEvalFactory(): ReactiveEval {
  return new ReactiveEval();
}

function iterAt(iter: Iterable<any>, at: number): any {
  let n = 0;

  for (const e of iter) if (n++ === at) return e;

  return undefined;
}

function iterSlice(iter: Iterable<any>, from: number): any {
  let n = 0;
  const res = [];

  for (const e of iter) if (n++ >= from) res.push(e);

  return res;
}
