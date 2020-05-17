declare namespace jasmine {
  interface Matchers<T> {
    toBeObservable(expectationFailOutput?: string): boolean;
  }
}
