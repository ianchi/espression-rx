import { ESnextParser } from 'espression';
import { ReactiveEval } from '../../src/main';
import { TestScheduler } from 'rxjs/testing';

const parser = new ESnextParser(true);
const _eval = new ReactiveEval();
function evaluate(expression: string, context: any) {
  return _eval.evaluate(parser.parse(expression), context);
}
(global as any).espression = { parser, eval: _eval, evaluate };

export function testScheduler() {
  return new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
}
