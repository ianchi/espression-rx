# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.3.14](https://github.com/ianchi/ESpression-rx/compare/v0.3.13...v0.3.14) (2021-01-30)

### [0.3.13](https://github.com/ianchi/ESpression-rx/compare/v0.3.12...v0.3.13) (2020-09-28)

### [0.3.12](https://github.com/ianchi/ESpression-rx/compare/v0.3.11...v0.3.12) (2020-06-13)


### Bug Fixes

* don't emit on nested RxObject change ([c392137](https://github.com/ianchi/ESpression-rx/commit/c392137997b74bf1f0d44e236eed74403ca66248))

### [0.3.11](https://github.com/ianchi/ESpression-rx/compare/v0.3.10...v0.3.11) (2020-05-30)


### Bug Fixes

* **combineMixed:** remove object input ([c87992e](https://github.com/ianchi/ESpression-rx/commit/c87992ee98de2a12d9a71536bbc68b85465e2ad5))
* **reactive:** error in member expr on RxObject ([fdf2936](https://github.com/ianchi/ESpression-rx/commit/fdf2936a4ce9087eb22cd7d3c2e3cdc2e3985fd9))
* **RxObject:** error on assignment of observable ([9386568](https://github.com/ianchi/ESpression-rx/commit/93865688dfa6ae44a01c71dae714b80b22d0ac08))
* evaluation errors ([a37a39c](https://github.com/ianchi/ESpression-rx/commit/a37a39cc38ee4c2ab655aabf79294851ac2ba96c))
* **RxObject:** only deep recurse in plain objects ([b5cc731](https://github.com/ianchi/ESpression-rx/commit/b5cc73136b486483486474e6ee1ea2d8a3bc671b))

### [0.3.10](https://github.com/ianchi/ESpression-rx/compare/v0.3.9...v0.3.10) (2020-04-26)


### Bug Fixes

* **RxObject:** cache to avoid circular ref in deep ([5f29f08](https://github.com/ianchi/ESpression-rx/commit/5f29f08599ceee360a3a8959922ae1e5bfbb4306))
* **RxObject:** fix deep not working on assignement ([9b39c79](https://github.com/ianchi/ESpression-rx/commit/9b39c79c516f832b2a5da972684d73b2b1c9f26c))

### [0.3.9](https://github.com/ianchi/ESpression-rx/compare/v0.3.8...v0.3.9) (2020-04-19)

### [0.3.8](https://github.com/ianchi/ESpression-rx/compare/v0.3.7...v0.3.8) (2020-04-19)


### Features

* export RxObject interface ([f30434b](https://github.com/ianchi/ESpression-rx/commit/f30434bb7193e7d84e45e8a529e045fe363541f6))


### Bug Fixes

* assignement of observable to reactive object ([0ccd63c](https://github.com/ianchi/ESpression-rx/commit/0ccd63c955ddd884edbba5f4625b619beca2fc9c))

### [0.3.7](https://github.com/ianchi/ESpression-rx/compare/v0.3.6...v0.3.7) (2020-04-12)


### Features

* allow to pass lvalue unchecked ([a61b7f1](https://github.com/ianchi/ESpression-rx/commit/a61b7f1cbe7d68c9d6afb6bfdb4bb3c8a2a78152))


### Bug Fixes

* RxObject, must validate against null ([10f3be3](https://github.com/ianchi/ESpression-rx/commit/10f3be32148a1e704863cb159c181f4b472d5a7b))

### [0.3.6](https://github.com/ianchi/ESpression-rx/compare/v0.3.5...v0.3.6) (2020-04-03)


### Bug Fixes

* not unsusbcribing properly of shareReplay ([1e826f7](https://github.com/ianchi/ESpression-rx/commit/1e826f7883f44402f91e01d9a0127444f2789579))

### [0.3.5](https://github.com/ianchi/ESpression-rx/compare/v0.3.4...v0.3.5) (2020-03-23)


### Bug Fixes

* error in reactive member ([54a3d99](https://github.com/ianchi/ESpression-rx/commit/54a3d990f1167706ac838d0b1e24b2f54a9a3e0e))
* fcall of computed member ([417354b](https://github.com/ianchi/ESpression-rx/commit/417354bfbb779f6e8228252fb1d4db9dcecdba4f))

### [0.3.4](https://github.com/ianchi/ESpression-rx/compare/v0.3.3...v0.3.4) (2020-03-22)


### Bug Fixes

* regression in fcall on member exp ([303723e](https://github.com/ianchi/ESpression-rx/commit/303723ed7c6210229e7c09df6216019c56b18be5))

### [0.3.3](https://github.com/ianchi/ESpression-rx/compare/v0.3.2...v0.3.3) (2020-03-18)


### Features

* add nullish coalescing operator evaluation ([397b38e](https://github.com/ianchi/ESpression-rx/commit/397b38ea7da1104b597128ea2b3b527fb2f88d08))
* add optional chain evaluation ([218f2db](https://github.com/ianchi/ESpression-rx/commit/218f2dbc36fef74989dc9912c9a79c8c4f057546))
* add reactive eval of destructuring assignmt ([74cd9f6](https://github.com/ianchi/ESpression-rx/commit/74cd9f6d8bd58f276ea9709cebb90ed2cacf63d2))


### Bug Fixes

* fixes regression in function call ([f5f5c3d](https://github.com/ianchi/ESpression-rx/commit/f5f5c3d3770cbd83e1a0edf71f2c1707256e0a98))
* remove 'console' calls ([67d7b74](https://github.com/ianchi/ESpression-rx/commit/67d7b74df8c44ab3ff9b931204000dc919b71f3e))

### [0.3.2](https://github.com/ianchi/ESpression-rx/compare/v0.3.1...v0.3.2) (2020-01-29)


### Bug Fixes

* handling of lvalues ([e3bfda5](https://github.com/ianchi/ESpression-rx/commit/e3bfda5980e88c4f7d8a170049e44a8918934d3b))
* **RxObject:** adds deleteProperty handler ([33f6851](https://github.com/ianchi/ESpression-rx/commit/33f68513d7aa804fdcd9c4d86be9c7af8286baae))
* try to resolve arrow function expression ([5e99f9f](https://github.com/ianchi/ESpression-rx/commit/5e99f9f02359427e3fb766cf3e961d5fb403ecf7))

### [0.3.1](https://github.com/ianchi/ESpression-rx/compare/v0.3.0...v0.3.1) (2019-07-14)


### Bug Fixes

* **combineLatest:** add missing overload ([db2f443](https://github.com/ianchi/ESpression-rx/commit/db2f443))



## [0.3.0](https://github.com/ianchi/ESpression-rx/compare/v0.2.2...v0.3.0) (2019-07-13)


### Features

* support arrow function expressions ([481c5e9](https://github.com/ianchi/ESpression-rx/commit/481c5e9))



### [0.2.2](https://github.com/ianchi/ESpression-rx/compare/v0.2.1...v0.2.2) (2019-07-13)


### Bug Fixes

* **combineMixed:** first param not detected as Obs ([8efcd41](https://github.com/ianchi/ESpression-rx/commit/8efcd41))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/ianchi/ESpression-rx/compare/v0.2.0...v0.2.1) (2019-07-12)


### Bug Fixes

* assignment of observable to RxObject ([e26d4c7](https://github.com/ianchi/ESpression-rx/commit/e26d4c7))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/ianchi/ESpression-rx/compare/v0.1.2...v0.2.0) (2019-03-10)


### Features

* **RxObject:** add custom handler support ([28ae4e5](https://github.com/ianchi/ESpression-rx/commit/28ae4e5))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/ianchi/ESpression-rx/compare/v0.1.1...v0.1.2) (2018-08-26)


### Bug Fixes

* use generics in RxObject for better typing ([ec888b4](https://github.com/ianchi/ESpression-rx/commit/ec888b4))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/ianchi/ESpression-rx/compare/v0.1.0...v0.1.1) (2018-08-17)


### Bug Fixes

* evaluation of short-circuited operators ([03fed8b](https://github.com/ianchi/ESpression-rx/commit/03fed8b))



<a name="0.1.0"></a>
# 0.1.0 (2018-08-16)


### Features

* initial implementation ([02bedc3](https://github.com/ianchi/ESpression-rx/commit/02bedc3))
