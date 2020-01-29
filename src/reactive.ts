/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
  BINARY_EXP,
  ES6StaticEval,
  ILvalue,
  INode,
  keyedObject,
  unsuportedError,
} from 'espression';
import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { AS_OBSERVABLE, GET_OBSERVABLE, isReactive } from './rxobject';

/**
 * Extends ES5 StaticEval to perform reactive evaluation of expressions having Observable values.
 * It returns an Observable which emmits a new result when any dependet member emmits a new value
 */
export class ReactiveEval extends ES6StaticEval {
  lvalue(node: INode, context: object): ILvalue {
    const result = super.lvalue(node, context);
    if (isObservable(result.o) || isObservable(result.m))
      throw new Error('Left side expression cannot be reactive.');

    return result;
  }

  /** Rule to evaluate `MemberExpression` */
  protected MemberExpression(node: INode, context: object): any {
    const obj = this._eval(node.object, context);
    const member = node.computed ? this._eval(node.property, context) : node.property.name;

    if (isReactive(obj)) {
      if (isObservable(member))
        return member.pipe(
          switchMap(prop =>
            obj[GET_OBSERVABLE](prop).pipe(
              // if the asigned value is an observable, switch to it
              switchMap(res => (isObservable(res) ? res : of(res)))
            )
          )
        );

      if (isReactive(obj[member])) return obj && obj[member];

      return obj[GET_OBSERVABLE](member).pipe(
        // if the asigned value is an observable, switch to it
        switchMap(res => (isObservable(res) ? res : of(res)))
      );
    } else if (isObservable<any>(obj)) {
      if (isObservable<any>(member)) {
        return combineLatest([obj, member]).pipe(map(([o, m]: [keyedObject, string]) => o && o[m]));
      } else {
        return obj.pipe(map((o: keyedObject) => o && o[member]));
      }
    }

    if (isObservable<any>(member)) return member.pipe(map(prop => obj && obj[prop]));

    return obj && obj[member];
  }

  /** Rule to evaluate `CallExpression` */
  protected CallExpression(node: INode, context: object): any {
    const funcDef:
      | { obj: object; func: () => any; args: [] }
      | Observable<{ obj: object; func: () => any; args: [] }> = this._fcall(node, context);

    if (!isObservable(funcDef)) return funcDef.func.apply(funcDef.obj, funcDef.args);

    return funcDef.pipe(
      switchMap(def => {
        try {
          const result = def.func.apply(def.obj, def.args);

          return isObservable(result) ? result : of(result);
        } catch (e) {
          console.warn('Eval error', e);
          return of(undefined);
        }
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

        console.warn('Returning unresolved observable from arrow function expression');
        return resultOrObservable;
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
    ).pipe(
      map(res => {
        try {
          return operatorCB(...res);
        } catch (e) {
          console.warn('Eval error', e);
          return undefined;
        }
      })
    );
  }
}
export function reactiveEvalFactory(): ReactiveEval {
  return new ReactiveEval();
}
