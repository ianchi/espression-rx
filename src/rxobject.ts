/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { BehaviorSubject, Subscription } from 'rxjs';

export const AS_OBSERVABLE = Symbol('asObservable'),
  GET_OBSERVABLE = Symbol('getObservable'),
  IS_REACTIVE = Symbol('isReactive');

/** Array mutating methods that must trigger emmit */
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

// tslint:disable-next-line:naming-convention
// tslint:disable-next-line:typedef
export function RxObject<T extends object>(base: T, deep = false, handler?: ProxyHandler<T>): T {
  const propSubjects: { [P in keyof T]?: BehaviorSubject<T[P]> } = {};
  const propSubscriptions: { [P in keyof T]?: Subscription } = {};
  const mainSubject = new BehaviorSubject<T>(base);

  if (typeof base !== 'object') throw new Error('Base must be an object or array');

  if (deep) {
    for (const prop in base) {
      const node: any = base[prop];
      if (typeof node === 'object') base[prop] = RxObject(node, true);
    }
  }

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
      }
      const cb = target[<keyof T>prop];
      if (Array.isArray(target) && typeof cb === 'function' && mutatingMethods.indexOf(prop) >= 0) {
        // tslint:disable-next-line:only-arrow-functions
        return function(): any {
          // tslint:disable-next-line:ban-types
          const ret = (cb as Function).apply(target, arguments);
          mainSubject.next(target);
          // emmit new values for all suscribed
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
      const sub = propSubjects[prop];
      if (sub) sub.next(target[prop]);

      mainSubject.next(target);

      // also emit if nested object changes

      if (deep) {
        if (propSubscriptions[prop]) {
          propSubscriptions[prop]!.unsubscribe();
          delete propSubscriptions[prop];
        }
        if (typeof value === 'object') {
          if (!isReactive(value)) value = RxObject(value, true);
          propSubscriptions[prop] = value[AS_OBSERVABLE]().subscribe((val: any) => {
            if (sub) sub.next(val);
            mainSubject.next(target);
          });
        }
      }
      return true;
    },
  });

  return proxy;
}

export function isReactive(obj: any): boolean {
  return !!(obj && typeof obj[IS_REACTIVE] === 'function');
}
