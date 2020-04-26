/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { BehaviorSubject, isObservable, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

export const AS_OBSERVABLE = Symbol('asObservable');

export const GET_OBSERVABLE = Symbol('getObservable');

export const IS_REACTIVE = Symbol('isReactive');
export const SET_OBSERVABLE = Symbol('setObservable');

export interface IRxProperties<T> {
  /** Returns an observable of the whole object */
  [AS_OBSERVABLE]: () => Observable<T>;

  /** Returns an observable of a specific member */
  [GET_OBSERVABLE](prop: keyof T): Observable<any>;

  /** Returns true if the object is Reactive */
  [IS_REACTIVE](): boolean;

  [SET_OBSERVABLE](
    propName: keyof T,
    inner: Observable<T[any]>,
    operatorFn: (a: { [key: string]: any }, m: string, b: any) => any
  ): Observable<T[any]>;
}

/** Array mutating methods that must trigger emit */
const mutatingMethods: Array<string | number | symbol> = [
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
];
const rxCache = new WeakMap<object, { deep?: any; proxy?: any }>();

// tslint:disable-next-line:naming-convention
// tslint:disable-next-line:typedef
export function RxObject<T extends object>(base: T, deep = false, handler?: ProxyHandler<T>): T {
  const propSubjects: { [P in keyof T]?: BehaviorSubject<T[P]> } = {};
  const propSubscriptions = {} as { [P in keyof T]?: Subscription };
  const mainSubject = new BehaviorSubject<T>(base);
  const innerObservable = {} as { [P in keyof T]?: Observable<T[P]> };

  if (base === null || typeof base !== 'object') throw new Error('Base must be an object or array');
  const rawBase = base;
  let cache = rxCache.get(rawBase);

  if (deep) {
    if (cache?.deep) return cache.deep;
    for (const prop in base) {
      const node: any = base[prop];
      if (node !== null && typeof node === 'object' && !isReactive(node) && !isObservable(node))
        base[prop] = RxObject(node, true);
    }
  } else if (cache?.proxy) return cache.proxy;

  const proxy = new Proxy<T>(base, {
    get: (target: T, prop: keyof T | symbol, receiver: any) => {
      if (prop === GET_OBSERVABLE) {
        return (propName: keyof T) =>
          propName in propSubjects
            ? propSubjects[propName]
            : (propSubjects[propName] = new BehaviorSubject(target[propName]));
      } else if (prop === AS_OBSERVABLE) {
        return () => mainSubject.asObservable();
      } else if (prop === IS_REACTIVE) {
        return () => true;
      } else if (prop === SET_OBSERVABLE) {
        return (
          propName: keyof T,
          inner: Observable<T[any]>,
          operatorFn: (a: { [key: string]: any }, m: string, b: any) => any
        ): Observable<T[any]> => {
          innerObservable[propName] = inner;

          return inner.pipe(
            map(val =>
              operatorFn(
                innerObservable[propName] === inner
                  ? receiver
                  : { [propName as string]: target[propName] },
                propName as string,
                val
              )
            )
          );
        };
      }
      const cb = target[<keyof T>prop];
      if (Array.isArray(target) && typeof cb === 'function' && mutatingMethods.indexOf(prop) >= 0) {
        // tslint:disable-next-line:only-arrow-functions
        return function(): any {
          // tslint:disable-next-line:ban-types
          const ret = (cb as Function).apply(target, arguments);
          mainSubject.next(target);
          // emit new values for all subscribed
          for (const key in propSubjects) {
            propSubjects[key]!.next(target[key]);
          }
          return ret;
        };
      }
      return handler && handler.get ? handler.get(target, prop, receiver) : cb;
    },

    set: (target: T, prop: keyof T, value: any, receiver: any): boolean => {
      if (handler && handler.set) {
        if (!handler.set(target, prop, value, receiver)) return false;
      } else target[prop] = value;

      // if something new is assigned, previous assigned inner observable
      if (prop in innerObservable) delete innerObservable[prop];

      const sub = propSubjects[prop];
      if (sub) sub.next(target[prop]);

      mainSubject.next(target);

      // also emit if nested object changes

      if (deep) {
        const propSubs = propSubscriptions[prop];
        if (propSubs) {
          propSubs.unsubscribe();
          delete propSubscriptions[prop];
        }
        if (value !== null && typeof value === 'object' && !isObservable(value)) {
          if (!isReactive(value)) value = RxObject(value, true);
          propSubscriptions[prop] = value[AS_OBSERVABLE]().subscribe((val: any) => {
            if (sub) sub.next(val);
            mainSubject.next(target);
          });
        }
      }
      return true;
    },

    deleteProperty(target: T, prop: keyof T): boolean {
      if (!(prop in target)) return delete target[prop];
      const sub = propSubjects[prop];
      const ret = delete target[prop];
      if (sub) sub.next(target[prop]);

      mainSubject.next(target);

      // remove nested subscription

      if (deep) {
        const propSubs = propSubscriptions[prop];
        if (propSubs) {
          propSubs.unsubscribe();
          delete propSubscriptions[prop];
        }
      }

      return ret;
    },
  });

  if (!cache) cache = {};
  if (deep) cache.deep = base;
  else cache.proxy = base;
  rxCache.set(rawBase, cache);
  return proxy;
}

export function isReactive(obj: any): boolean {
  return !!(obj && typeof obj[IS_REACTIVE] === 'function');
}
