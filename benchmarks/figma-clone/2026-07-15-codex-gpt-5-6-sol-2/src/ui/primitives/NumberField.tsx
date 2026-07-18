import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { clamp, cx } from './internal';

export interface NumericExpressionSuccess {
  ok: true;
  value: number;
}

export interface NumericExpressionFailure {
  ok: false;
  error: string;
}

export type NumericExpressionResult = NumericExpressionSuccess | NumericExpressionFailure;

function parseNumericExpression(source: string): NumericExpressionResult {
  let cursor = 0;

  const skipWhitespace = () => {
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
  };

  const parseNumber = (): number | null => {
    skipWhitespace();
    const remaining = source.slice(cursor);
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(remaining);
    const token = match?.[0];
    if (!token) return null;
    cursor += token.length;
    const numericValue = Number(token);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const parsePrimary = (): number | null => {
    skipWhitespace();
    const character = source[cursor];
    if (character === '+' || character === '-') {
      cursor += 1;
      const operand = parsePrimary();
      if (operand === null) return null;
      return character === '-' ? -operand : operand;
    }
    if (character === '(') {
      cursor += 1;
      const value = parseSum();
      skipWhitespace();
      if (source[cursor] !== ')') return null;
      cursor += 1;
      return value;
    }
    return parseNumber();
  };

  const parseProduct = (): number | null => {
    let left = parsePrimary();
    if (left === null) return null;

    for (;;) {
      skipWhitespace();
      const operator = source[cursor];
      if (operator !== '*' && operator !== '/') break;
      cursor += 1;
      const right = parsePrimary();
      if (right === null || (operator === '/' && right === 0)) return null;
      left = operator === '*' ? left * right : left / right;
      if (!Number.isFinite(left)) return null;
    }
    return left;
  };

  const parseSum = (): number | null => {
    let left = parseProduct();
    if (left === null) return null;

    for (;;) {
      skipWhitespace();
      const operator = source[cursor];
      if (operator !== '+' && operator !== '-') break;
      cursor += 1;
      const right = parseProduct();
      if (right === null) return null;
      left = operator === '+' ? left + right : left - right;
      if (!Number.isFinite(left)) return null;
    }
    return left;
  };

  const value = parseSum();
  skipWhitespace();
  if (value === null || cursor !== source.length) {
    return { ok: false, error: 'Enter a number or arithmetic expression.' };
  }
  return { ok: true, value };
}

/** Evaluates numbers and +, -, *, /, unary signs, exponents, and parentheses without eval. */
export function evaluateNumericExpression(
  expression: string,
  relativeTo?: number,
): NumericExpressionResult {
  const trimmedExpression = expression.trim();
  if (!trimmedExpression) return { ok: false, error: 'A value is required.' };
  const relativeExpression =
    relativeTo !== undefined && /^[*/]/.test(trimmedExpression)
      ? `${relativeTo}${trimmedExpression}`
      : trimmedExpression;
  return parseNumericExpression(relativeExpression);
}

function roundToPrecision(value: number, precision: number): number {
  const magnitude = 10 ** precision;
  return Math.round((value + Number.EPSILON) * magnitude) / magnitude;
}

function formatValue(value: number | null, precision: number): string {
  if (value === null) return '';
  return String(roundToPrecision(value, precision));
}

export interface NumberFieldProps {
  value: number | null;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  ariaLabel: string;
  label?: ReactNode;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  shiftMultiplier?: number;
  altMultiplier?: number;
  precision?: number;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function NumberField({
  value,
  onValueChange,
  onValueCommit,
  ariaLabel,
  label,
  suffix,
  placeholder = 'Mixed',
  min = -Infinity,
  max = Infinity,
  step = 1,
  shiftMultiplier = 10,
  altMultiplier = 0.1,
  precision = 3,
  disabled = false,
  readOnly = false,
  className,
}: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelBlurCommitRef = useRef(false);
  const errorId = useId();
  const [draft, setDraft] = useState(() => formatValue(value, precision));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing && !error) setDraft(formatValue(value, precision));
  }, [editing, error, precision, value]);

  const applyValue = (nextValue: number, commit: boolean) => {
    const normalizedValue = roundToPrecision(clamp(nextValue, min, max), precision);
    setDraft(formatValue(normalizedValue, precision));
    setError(null);
    onValueChange(normalizedValue);
    if (commit) onValueCommit?.(normalizedValue);
  };

  const commitDraft = (): boolean => {
    const result = evaluateNumericExpression(draft, value ?? undefined);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    applyValue(result.value, true);
    return true;
  };

  const increment = (direction: 1 | -1, event: KeyboardEvent<HTMLInputElement>) => {
    const modifier = event.shiftKey ? shiftMultiplier : event.altKey ? altMultiplier : 1;
    applyValue((value ?? 0) + direction * step * modifier, true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      increment(event.key === 'ArrowUp' ? 1 : -1, event);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (commitDraft()) inputRef.current?.select();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelBlurCommitRef.current = true;
      setDraft(formatValue(value, precision));
      setError(null);
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    setEditing(false);
    if (cancelBlurCommitRef.current) {
      cancelBlurCommitRef.current = false;
      return;
    }
    if (!error && draft === formatValue(value, precision)) return;
    commitDraft();
  };

  return (
    <label
      className={cx(
        'ui-number-field',
        error && 'ui-number-field--invalid',
        disabled && 'ui-number-field--disabled',
        className,
      )}
    >
      {label ? (
        <span className="ui-number-field__label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <input
        ref={inputRef}
        className="ui-number-field__input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-errormessage={error ? errorId : undefined}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          setError(null);
        }}
        onFocus={(event) => {
          setEditing(true);
          event.currentTarget.select();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {suffix ? <span className="ui-number-field__suffix">{suffix}</span> : null}
      <span id={errorId} className="ui-visually-hidden" role="alert">
        {error}
      </span>
    </label>
  );
}
