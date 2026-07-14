import { describe, expect, it } from 'vitest';
import { evaluateExpression } from './expr';

describe('evaluateExpression', () => {
  it('parses plain numbers', () => {
    expect(evaluateExpression('42')).toBe(42);
    expect(evaluateExpression(' 3.5 ')).toBe(3.5);
    expect(evaluateExpression('-8')).toBe(-8);
  });

  it('respects precedence and parentheses', () => {
    expect(evaluateExpression('2+3*4')).toBe(14);
    expect(evaluateExpression('(2+3)*4')).toBe(20);
    expect(evaluateExpression('100/4-5')).toBe(20);
    expect(evaluateExpression('-(2+3)')).toBe(-5);
  });

  it('rejects garbage', () => {
    expect(evaluateExpression('')).toBeNull();
    expect(evaluateExpression('abc')).toBeNull();
    expect(evaluateExpression('1+')).toBeNull();
    expect(evaluateExpression('(1+2')).toBeNull();
    expect(evaluateExpression('1/0')).toBeNull(); // Infinity is not a usable value
  });
});
