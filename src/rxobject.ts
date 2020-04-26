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

export interface IRxProperties<T extends object> {
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
const rxCache = new WeakMap<object, { deep?: any; proxy?: any }>();

// tslint:disable-next-line:naming-convention
// tslint:disable-next-line:typedef
export function RxObject<T extends object>(base: T, deep = false, handler?: ProxyHandler<T>): T {
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

  const proxy = new Proxy<T>(base, new RxHandler(base, deep, handler));

  if (!cache) cache = {};
  if (deep) cache.deep = base;
  else cache.proxy = base;
  rxCache.set(rawBase, cache);
  return proxy;
}

export function isReactive(obj: any): boolean {
  return !!(obj && typeof obj[IS_REACTIVE] === 'function');
}

class RxHandler<T extends object> implements ProxyHandler<T> {
  /** Subject for the whole object */
  private main$: BehaviorSubject<T>;
  /** Map of subjects for each property */
  private properties$: { [P in keyof T]?: BehaviorSubject<T[P]> } = {};
  /**  */
  private subscriptions: { [P in keyof T]?: Subscription } = {};
  /** Inner Observable currently assigned to a property via SET_OBSERVABLE */
  private inner$: { [P in keyof T]?: Observable<T[P]> } = {};

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
    if (property in this.inner$) delete this.inner$[property];

    // also emit if nested object changes

    if (this.deep) {
      if (this.subscriptions[property]) {
        this.subscriptions[property]!.unsubscribe();
        delete this.subscriptions[property];
      }
      if (value !== null && typeof value === 'object' && !isObservable(value)) {
        if (!isReactive(value)) target[property] = value = RxObject(value, true);
        this.subscriptions[property] = value[AS_OBSERVABLE]().subscribe((val: any) => {
          const sub = this.properties$[property];
          if (sub) sub.next(val);
          this.main$.next(target);
        });
        return true;
      }
    }
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
      map(val =>
        operatorFn(
          this.inner$[property] === inner ? receiver : { [property as string]: target[property] },
          property as string,
          val
        )
      )
    );
  }

  arrayMutating(target: T & any[], method: MutatingMethod, ...args: any[]): any {
    // tslint:disable-next-line: ban-types
    const ret = (target[method] as Function).apply(target, args);
    this.main$.next(target);
    // emit new values for all subscribed
    for (const key in this.properties$) {
      this.properties$[key]!.next(target[key]);
    }
    return ret;
  }
}
