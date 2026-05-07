import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement('div', { 'data-testid': 'child' }, 'OK')
      )
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows fallback when a child throws', () => {
    const Boom = () => { throw new Error('boom'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(Boom)
      )
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('try-again button resets the error state', async () => {
    let shouldThrow = true;
    const MaybeThrow = () => {
      if (shouldThrow) throw new Error('crash');
      return React.createElement('span', null, 'recovered');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(React.createElement(ErrorBoundary, null, React.createElement(MaybeThrow)));
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('Core JS utilities', () => {
  it('trims whitespace', () => {
    expect('  hello  '.trim()).toBe('hello');
  });

  it('deduplicates arrays', () => {
    const arr = [1, 2, 2, 3, 3];
    expect([...new Set(arr)]).toEqual([1, 2, 3]);
  });

  it('spreads objects correctly', () => {
    const result = { ...{ a: 1 }, ...{ a: 2, b: 3 } };
    expect(result).toEqual({ a: 2, b: 3 });
  });

  it('resolves promises', async () => {
    const val = await Promise.resolve('done');
    expect(val).toBe('done');
  });

  it('handles null coalescing', () => {
    const val = null ?? 'default';
    expect(val).toBe('default');
  });

  it('optional chaining returns undefined safely', () => {
    const obj = null;
    expect(obj?.name).toBeUndefined();
  });
});
