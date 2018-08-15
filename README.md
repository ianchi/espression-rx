# ESpression-Rx

_[ESpression](https://github.com/ianchi/espression) extension to perform reactive evaluation of expressions._

## Usage

Reactive expressions can be evaluated using `reactiveEvalFactory`. The evaluation returns an observable which emits the result each time any operand emits a result.

If any operand is or returns an observable, the expression will be evaluated with the values it emits instead of the observable object itself.
Static operands are evaluated only once, when creating the resulting observable, any later changes won't be seen.
If an `lvalue` is required (i.e. for update/assign operation) it can't be an observable. This operations are only statically evaluated.

```
import { es5PathParserFactory, reactiveEvalFactory } from 'espression';
import { of } from 'rxjs';


const parser = es5PathParserFactory();
const rxEval = reactiveEvalFactory();

const context = {
  a: rxjs.of(1,2,3, rxjs.asyncScheduler),
  b: 0,
  c: rxjs.of(10, 20, 30, 40,rxjs.asyncScheduler).pipe(rxop.share())
  };

rxEval.eval(parser.parse('d=c*1000; a + ++b * c + d '), context)
  .subscribe(d =>
    console.log(d)
  );
```

This preset introduces a new syntax to mix jsonPath inside a normal ES5 expression with a jsonPath literal notation. It is a regular jsonPath expression enclosed in `<>`, it returns a `jsonPath` object as described above.

```
import { jsonPathFactory } from 'espression';

const jp = jsonPathFactory();

let result = jp.evaluate('x + <z..d[:-1]>.values[0]', {x: 10, z: {a:1, b:2, c:3, d: [1,2,3]}});
```

This is shorthand for:

```
import { es5PathParserFactory, jsonPathEvalFactory } from 'espression';

const parser = es5PathParserFactory();
const staticEval = jsonPathEvalFactory();

let ast = parser.parse('x + <z..d[:-1]>.values[0]');
let result = staticEval.eval(ast, {x: 10, z: {a:1, b:2, c:3, d: [1,2,3]}});
```

## Bundling

Each of these components is fully independent, so that when included with es6 imports, your final bundle can then be tree shaken, and only the used presets/rules included.

## License

[MIT](LICENSE).
