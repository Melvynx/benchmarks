// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './lib/storage';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  };
}

function mockMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: memoryStorage(),
  });
  mockMedia(false);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

it('restores the default board, title, and shared overlap', () => {
  render(<App />);
  expect(document.title).toBe('Grok 4.7');
  expect(screen.getByRole('heading', { level: 1, name: 'Grok 4.7' }).textContent).toBe('Grok 4.7');
  expect(screen.getByText('Green cells = everyone awake')).toBeTruthy();
  const rows = screen.getAllByTestId('city-row');
  expect(rows.map((row) => row.getAttribute('data-city'))).toEqual(['san-francisco', 'denpasar', 'geneva']);
  expect(rows[0].textContent).toContain('REF');
  expect(screen.getByTestId('overlap-summary').textContent).toContain('2 hours in common');
  expect(screen.getByTestId('overlap-summary').textContent).toContain('7am \u2014 8am');
  expect(screen.getByTestId('overlap-summary').textContent).toContain('10pm \u2014 11pm');
  expect(document.querySelectorAll('[data-state="overlap"]')).toHaveLength(6);
  expect(document.querySelector('[data-city="denpasar"][data-hour="0"]')?.textContent).toContain('3');
  expect(document.querySelector('.desktop-grid')).toBeTruthy();
  expect(document.querySelector('.mobile-board')).toBeNull();
});

it('uses an independent mobile layout', () => {
  mockMedia(true);
  render(<App />);
  expect(document.querySelector('[data-layout="mobile"]')).toBeTruthy();
  expect(document.querySelector('.mobile-board')).toBeTruthy();
  expect(document.querySelector('.desktop-grid')).toBeNull();
  expect(document.querySelectorAll('[data-state="overlap"]')).toHaveLength(6);
});

it('promotes, removes, and adds cities without duplicates', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Make Denpasar the reference city' }));
  expect(screen.getAllByTestId('city-row')[0].getAttribute('data-city')).toBe('denpasar');
  expect(screen.getAllByTestId('city-row')[0].textContent).toContain('REF');

  fireEvent.click(screen.getByRole('button', { name: 'Remove Geneva' }));
  expect(screen.getAllByTestId('city-row').map((row) => row.getAttribute('data-city'))).toEqual(['denpasar', 'san-francisco']);

  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Tokyo' } });
  fireEvent.click(screen.getByRole('option', { name: /Tokyo/ }));
  expect(document.querySelector('[data-city="tokyo"]')).toBeTruthy();

  fireEvent.change(input, { target: { value: 'Tokyo' } });
  expect((screen.getByRole('option', { name: /Tokyo/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getAllByTestId('city-row').filter((row) => row.getAttribute('data-city') === 'tokyo')).toHaveLength(1);
});

it('shows Mumbai half-hour local time', () => {
  render(<App />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Mumbai' } });
  fireEvent.click(screen.getByRole('option', { name: /Mumbai/ }));
  const cell = document.querySelector('[data-city="mumbai"][data-hour="0"]');
  expect(cell?.textContent).toContain('12:30');
  expect(cell?.textContent?.toLowerCase()).toContain('pm');
});

it('switches to base mode, 24-hour labels, and an empty overlap', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Base' }));
  expect(screen.getByRole('button', { name: 'Base' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('Green cells = awake with San Francisco')).toBeTruthy();
  expect(screen.getByTestId('summary-denpasar').textContent).toContain('8 hours');
  expect(screen.getByTestId('summary-geneva').textContent).toContain('7am \u2014 2pm');
  expect(document.querySelectorAll('[data-state="overlap"]')).toHaveLength(16);
  expect(document.querySelector('[data-city="san-francisco"][data-state="overlap"]')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /Awake/ }));
  fireEvent.click(screen.getByRole('button', { name: '24h' }));
  expect(screen.getByTestId('summary-geneva').textContent).toContain('07:00 \u2014 14:00');

  fireEvent.change(screen.getByLabelText('Wake-up hour'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Sleep hour'), { target: { value: '1' } });
  expect(screen.getByTestId('overlap-summary').textContent).toContain('No overlap with San Francisco');
  expect(document.querySelectorAll('[data-state="overlap"]')).toHaveLength(0);
  expect(document.querySelector('[data-city="san-francisco"][data-hour="0"]')?.getAttribute('data-state')).toBe('awake');
});

it('persists the mode across a reload', () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Base' }));
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').mode).toBe('base');
  first.unmount();
  render(<App />);
  expect(screen.getByRole('button', { name: 'Base' }).getAttribute('aria-pressed')).toBe('true');
});
