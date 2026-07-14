/**
 * Tiny arithmetic-expression evaluator for number inputs ("120+8*2", "100/3").
 * Recursive descent over + - * / ( ) and unary minus. No identifiers, no eval().
 */
export function evaluateExpression(input: string): number | null {
  const src = input.trim();
  if (src === '') return null;
  let pos = 0;

  const peek = (): string => src[pos] ?? '';
  const skipWs = () => {
    while (peek() === ' ') pos++;
  };

  function parseNumber(): number | null {
    skipWs();
    const start = pos;
    if (peek() === '.' || (peek() >= '0' && peek() <= '9')) {
      while ((peek() >= '0' && peek() <= '9') || peek() === '.') pos++;
      const text = src.slice(start, pos);
      const value = Number(text);
      return Number.isFinite(value) ? value : null;
    }
    return null;
  }

  function parseFactor(): number | null {
    skipWs();
    if (peek() === '-') {
      pos++;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (peek() === '(') {
      pos++;
      const v = parseExpr();
      skipWs();
      if (peek() !== ')') return null;
      pos++;
      return v;
    }
    return parseNumber();
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    for (;;) {
      skipWs();
      const op = peek();
      if (op !== '*' && op !== '/') return left;
      pos++;
      const right = parseFactor();
      if (right === null) return null;
      left = op === '*' ? left * right : left / right;
    }
  }

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    for (;;) {
      skipWs();
      const op = peek();
      if (op !== '+' && op !== '-') return left;
      pos++;
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
  }

  const result = parseExpr();
  skipWs();
  if (result === null || pos !== src.length || !Number.isFinite(result)) return null;
  return result;
}
