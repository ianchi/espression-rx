/**
 * Copyright (c) 2018 Adrian Panella <ianchi74@outlook.com>
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { isPlainObject } from 'is-plain-object';
import { BehaviorSubject, isObservable, Observable } from 'rxjs';
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
type MutatingMethod =
  | 'copyWithin'
  | 'fill'
  | 'pop'
  | 'push'
  | 'reverse'
  | 'shift'
  | 'sort'
  | 'splice'
  | 'unshift';

const mutatingMethods: string[] = [
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
function isMutatingMethod(method: any): method is MutatingMethod {
  return typeof method === 'string' && mutatingMethods.indexOf(method) >= 0;
}
// eslint-disable-next-line @typescript-eslint/ban-types
const rxCache = new WeakMap<object, { deep?: any; proxy?: any }>();

// eslint-disable-next-line @typescript-eslint/ban-types
class RxHandler<T extends object> implements ProxyHandler<T> {
  /** Subject for the whole object */
  private main$: BehaviorSubject<T>;

  /** Map of subjects for each property */
  private properties$: { [P in keyof T]?: BehaviorSubject<T[P]> } = {};

  /** Inner Observable currently assigned to a property via SET_OBSERVABLE */
  private inner$: { [P in keyof T]?: Observable<T[P]> } = {};

  innnerUpdate = false;

  constructor(target: T, private deep: boolean = false, private handler?: ProxyHandler<T>) {
    this.main$ = new BehaviorSubject<T>(target);
  }

  // proxy traps
  get(target: T, property: keyof T, receiver: any): any {
    switch (property) {
      case GET_OBSERVABLE:
        return this[GET_OBSERVABLE].bind(this, target);
      case SET_OBSERVABLE:
        return this[SET_OBSERVABLE].bind(this, target, receiver);
      case AS_OBSERVABLE:
        return this[AS_OBSERVABLE].bind(this);
      case IS_REACTIVE:
        return this[IS_REACTIVE].bind(this);
      default:
        if (Array.isArray(target) && isMutatingMethod(property))
          return this.arrayMutating.bind(this, target, property);
    }

    return this.handler?.get ? this.handler.get(target, property, receiver) : target[property];
  }

  set(target: T, property: keyof T, value: any, receiver: any): boolean {
    if (this.handler?.set) {
      if (!this.handler.set(target, property, value, receiver)) return false;
    } else target[property] = value;

    // if something new is assigned, previous assigned inner observable
    if (property in this.inner$ && !this.innnerUpdate) delete this.inner$[property];

    // only convert to RxObject plain objects and arrays
    if (
      this.deep &&
      !isObservable(value) &&
      (Array.isArray(value) || isPlainObject(value)) &&
      !isReactive(value)
    )
      // eslint-disable-next-line no-multi-assign
      target[property] = value = RxObject(value, true);

    const sub = this.properties$[property];
    if (sub) sub.next(target[property]);

    this.main$.next(target);

    return true;
  }

  deleteProperty(target: T, prop: keyof T): boolean {
    if (!(prop in target)) return delete target[prop];
    const sub = this.properties$[prop];
    const ret = delete target[prop];
    if (sub) sub.next(target[prop]);

    this.main$.next(target);

    // remove nested subscription

    if (this.deep) {
      const propSubs = this.properties$[prop];
      if (propSubs) {
        propSubs.unsubscribe();
        delete this.properties$[prop];
      }
    }

    return ret;
  }

  // auxiliary functions

  /** Returns an observable of the property, that emits values when the property changes */
  [GET_OBSERVABLE](target: T, propName: keyof T): Observable<T[any]> {
    const subject =
      propName in this.properties$
        ? this.properties$[propName]
        : (this.properties$[propName] = new BehaviorSubject(target[propName]));
    return subject!.asObservable();
  }

  /** Returns an observable for the whole object */
  [AS_OBSERVABLE](): Observable<T> {
    return this.main$.asObservable();
  }

  /** Signature to mark as Reactive */
  [IS_REACTIVE](): boolean {
    return true;
  }

  [SET_OBSERVABLE](
    target: T,
    receiver: any,
    property: keyof T,
    inner: Observable<T[any]>,
    operatorFn: (a: { [key: string]: any }, m: string, b: any) => any
  ): Observable<T[any]> {
    this.inner$[property] = inner;

    return inner.pipe(
      map(val => {
        this.innnerUpdate = true;
        const res = operatorFn(
          this.inner$[property] === inner ? receiver : { [property as string]: target[property] },
          property as string,
          val
        );
        this.innnerUpdate = false;

        return res;
      })
    );
  }

  arrayMutating(target: T & any[], method: MutatingMethod, ...args: any[]): any {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const ret = (target[method] as Function).apply(target, args);
    this.main$.next(target);
    // emit new values for all subscribed
    for (const key in this.properties$) {
      this.properties$[key]!.next(target[key]);
    }
    return ret;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function RxObject<T extends object>(
  base: T,
  deep = false,
  handler?: ProxyHandler<T>
): IRxProperties<T> & T {
  if (base === null || typeof base !== 'object') throw new Error('Base must be an object or array');
  const rawBase = base;
  let cache = rxCache.get(rawBase);

  if (deep && (Array.isArray(base) || isPlainObject(base))) {
    if (cache?.deep) return cache.deep;
    for (const prop in base) {
      const node: any = base[prop];
      if (node !== null && typeof node === 'object' && !isReactive(node) && !isObservable(node))
        base[prop] = RxObject(node, true);
    }
  } else if (cache?.proxy) return cache.proxy;

  const proxy = new Proxy<T>(base, new RxHandler(base, deep, handler));

  if (!cache) cache = {};
  if (deep) cache.deep = base;
  else cache.proxy = base;
  rxCache.set(rawBase, cache);
  return proxy as IRxProperties<T> & T;
}

export function isReactive<T>(obj: T | IRxProperties<T>): obj is IRxProperties<T> {
  return !!(obj && typeof (obj as any)[IS_REACTIVE] === 'function');
}
