/** First argument of a jest mock's first call, typed `unknown` so the strict lint rules stay on. */
export function firstCallArg(fn: jest.Mock): unknown {
  return (fn.mock.calls as unknown[][])[0]?.[0];
}
