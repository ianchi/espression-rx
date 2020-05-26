
## Reactive expressions

Reactive expressions are a special kind of expressions that when evaluated, instead of returning a single value as the result, they may return a *stream* of results.

They do so when at least one operand is not a *scalar* value but an observable (or promise which is promoted to observable). In this case, whenever this operand emits a new value the expression is recomputed and a new result is emitted.

### Types of operands 

Reactive expressions recognize three types of operands which are treated differently:

+ *Scalars* : This are plain primitive values or js objects. Their value is static and it is calculated only once. If all operands in the expression are scalars, the result of a reactive evaluation is just the same as a plain evaluation in js. They can be *lvalues* with the normal js rules

+ *Observables* : An operand that evaluates to an RxJS observable, or a promise (internally promoted to observable). Having one operand of this type converts the expression in a *reactive* one. They are only *sources* of emissions, and thus they cannot be externally assigned a value. This implies that **any update operation on them will result in an error**.
They can be externally provided in the evaluation context or returned by a function made available in the evaluation context.

+ *RxObjects* : It is a special type of object that is in between. An operand of this type also makes the expression reactive.
When used in an *rvalue* position they behave as observables, emitting any new or changed value.
But they can also be used in an *lvalue* position and assigned new values to any property. And this new value will be emitted in any other place in the expression where this observable (or it’s property) is referenced. They are implemented with *Subjects*, which can emit values but also be observed.


## Evaluation Rules

+ In General operands are evaluated only once, at the time of evaluation/subscription to the evaluation.
+ This implies that if an operand evaluates to a scalar, that scalar will be *frozen* if it participated in an expression with another operand that is emitting values.
+ The exception to this rule are the shortcircuiting operators. They don’t immediately evaluate all their operands, but they evaluate their first operand and only evaluate the second after the corresponding condition is met, and after each emission of the first operand this gets re-evaluated.
The operators in this category are: logical expressions (&&, ||, ??), conditional expression (? : ), optional chaining (?.).
+ A RxObject cannot be on both sides of an assignment/update. This would create a circular reference, that will cause a `Max call stack reached` error.
+ Arrow functions cannot return *unresolved* observables. As arrow function expressions can be used as callbacks in external functions, the results cannot be automatically handled by ESpression-rx. Thus it must return a scalar value, or if it is an Observable it must be synchronously resolvable. Otherwise an error will be thrown.

### Valid Syntax

The full set of ES2020 expressions, with the exception of any non expression statement. This ensures that no unwanted code can be executed.

The special non standard `##` operator (*then* operator) is available to provide short circuited evaluation regardless of the value emitted.

` a ## b`
Is equivalent to
` a ? b : b`
But with shorter syntax and more explicit intention.

## Lvalues

