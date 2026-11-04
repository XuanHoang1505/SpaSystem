import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { useTableSearchParams, type TableSearchParamsOptions } from './useTableSearchParams';

function setup(initialUrl = '/owner/services', options?: TableSearchParamsOptions) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  );
  return renderHook(() => ({ table: useTableSearchParams(options), location: useLocation() }), {
    wrapper,
  });
}

describe('useTableSearchParams', () => {
  test('reads defaults when the URL has no table params', () => {
    const { result } = setup();
    expect(result.current.table.query).toEqual({
      pageNumber: 1,
      pageSize: 10,
      search: undefined,
      sortBy: undefined,
      sortDirection: undefined,
    });
    expect(result.current.table.hasFilters).toBe(false);
  });

  test('reads page, size, sort, search and filters from the URL and ignores invalid values', () => {
    const { result } = setup(
      '/x?page=3&pageSize=20&sortBy=price&sortDirection=desc&search=da&status=active',
    );
    expect(result.current.table.query).toEqual({
      pageNumber: 3,
      pageSize: 20,
      search: 'da',
      sortBy: 'price',
      sortDirection: 'desc',
    });
    expect(result.current.table.getFilter('status')).toBe('active');
    expect(result.current.table.hasFilters).toBe(true);

    const invalid = setup('/x?page=-2&pageSize=999');
    expect(invalid.result.current.table.pageNumber).toBe(1);
    expect(invalid.result.current.table.pageSize).toBe(10);
  });

  test('changing a filter, search or sort resets to page 1', () => {
    const { result } = setup('/x?page=4');
    act(() => result.current.table.setFilter('status', 'locked'));
    expect(result.current.location.search).toBe('?status=locked');

    act(() => result.current.table.setPage(2));
    act(() => result.current.table.setSearch('  massage '));
    expect(result.current.table.pageNumber).toBe(1);
    expect(result.current.table.search).toBe('massage');

    act(() => result.current.table.setPage(3));
    act(() => result.current.table.setSort({ sortBy: 'name', sortDirection: 'asc' }));
    expect(result.current.table.pageNumber).toBe(1);
    expect(result.current.table.sort).toEqual({ sortBy: 'name', sortDirection: 'asc' });
  });

  test('clearing the sort keeps "no sort" even when a default sort exists', () => {
    const defaultSort = { sortBy: 'createdAtUtc', sortDirection: 'desc' } as const;
    const { result } = setup('/x', { defaultSort });
    expect(result.current.table.sort).toEqual(defaultSort);
    act(() => result.current.table.setSort(null));
    expect(result.current.table.sort).toBeNull();
    expect(result.current.table.query.sortBy).toBeUndefined();
  });

  test('resetFilters clears everything and setFilter refuses reserved keys', () => {
    const { result } = setup('/x?search=da&status=active&page=2');
    act(() => result.current.table.resetFilters());
    expect(result.current.location.search).toBe('');
    expect(() => result.current.table.setFilter('page', '2')).toThrow(/reserved/);
  });
});
