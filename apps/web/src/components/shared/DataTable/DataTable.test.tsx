import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { TrashIcon } from 'lucide-react';
import { DataTable, type DataTableProps } from './DataTable';
import type { DataTableColumn } from './dataTable.types';

interface ServiceRow {
  id: string;
  name: string;
  price: number;
}

const rows: ServiceRow[] = [
  { id: 'svc-1', name: 'Chăm sóc da cơ bản', price: 350000 },
  { id: 'svc-2', name: 'Massage thư giãn', price: 500000 },
];

const columns: DataTableColumn<ServiceRow>[] = [
  { id: 'name', header: 'Tên dịch vụ', cell: (row) => row.name, sortKey: 'name' },
  { id: 'price', header: 'Giá', cell: (row) => `${row.price} đ`, align: 'end', hideBelow: 'md' },
];

function renderTable(props: Partial<DataTableProps<ServiceRow>> = {}) {
  return render(
    <DataTable<ServiceRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      caption="Danh sách dịch vụ"
      {...props}
    />,
  );
}

describe('DataTable', () => {
  test('renders header and one row per item with an accessible caption', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Danh sách dịch vụ' });
    expect(within(table).getByRole('columnheader', { name: /Tên dịch vụ/ })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('Massage thư giãn')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '350000 đ' })).toHaveClass('text-right', 'hidden');
  });

  test('shows skeleton rows on first load and marks the table busy', () => {
    renderTable({ data: undefined, isLoading: true, loadingRowCount: 3 });
    expect(screen.getAllByTestId('data-table-skeleton-row')).toHaveLength(3);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });

  test('shows the default empty state, or a custom one', () => {
    const { unmount } = renderTable({ data: [] });
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
    unmount();
    renderTable({ data: [], empty: <p>Không có dịch vụ phù hợp</p> });
    expect(screen.getByText('Không có dịch vụ phù hợp')).toBeInTheDocument();
  });

  test('shows the error state with a retry button instead of rows', async () => {
    const onRetry = vi.fn();
    renderTable({ error: 'Máy chủ chưa phản hồi.', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Máy chủ chưa phản hồi.');
    expect(screen.queryByText('Massage thư giãn')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('cycles server sort asc → desc → none and exposes aria-sort', async () => {
    const onSortChange = vi.fn();
    const { rerender } = renderTable({ sort: null, onSortChange });
    const header = () => screen.getByRole('columnheader', { name: /Tên dịch vụ/ });
    expect(header()).toHaveAttribute('aria-sort', 'none');

    await userEvent.click(screen.getByRole('button', { name: /Tên dịch vụ/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ sortBy: 'name', sortDirection: 'asc' });

    rerender(
      <DataTable<ServiceRow>
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        caption="Danh sách dịch vụ"
        sort={{ sortBy: 'name', sortDirection: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    expect(header()).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(screen.getByRole('button', { name: /Tên dịch vụ/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ sortBy: 'name', sortDirection: 'desc' });

    rerender(
      <DataTable<ServiceRow>
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        caption="Danh sách dịch vụ"
        sort={{ sortBy: 'name', sortDirection: 'desc' }}
        onSortChange={onSortChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Tên dịch vụ/ }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  test('row click works with mouse and keyboard', async () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    await userEvent.click(screen.getByText('Massage thư giãn'));
    expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);

    const firstRow = screen.getByText('Chăm sóc da cơ bản').closest('tr');
    firstRow?.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
  });

  test('row actions open a menu without triggering the row click', async () => {
    const onRowClick = vi.fn();
    const onDelete = vi.fn();
    renderTable({
      onRowClick,
      rowActions: () => [
        { label: 'Ngừng bán', icon: TrashIcon, variant: 'destructive', onSelect: onDelete },
      ],
    });
    await userEvent.click(screen.getAllByRole('button', { name: 'Thao tác' })[1]!);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Ngừng bán' }));
    expect(onDelete).toHaveBeenCalledWith(rows[1]);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  test('pagination shows the range and moves between pages', async () => {
    const onPageChange = vi.fn();
    renderTable({
      page: { pageNumber: 2, pageSize: 10, totalCount: 25, totalPages: 3 },
      onPageChange,
    });
    expect(screen.getByText('Hiển thị 11–20 trong 25')).toBeInTheDocument();
    expect(screen.getByText('Trang 2/3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Trang đầu' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  test('pagination disables buttons at the edges and while fetching', () => {
    const { rerender } = renderTable({
      page: { pageNumber: 1, pageSize: 10, totalCount: 2, totalPages: 1 },
      onPageChange: vi.fn(),
    });
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();

    rerender(
      <DataTable<ServiceRow>
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        caption="Danh sách dịch vụ"
        isFetching
        page={{ pageNumber: 2, pageSize: 10, totalCount: 25, totalPages: 3 }}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    expect(screen.getByText('Massage thư giãn')).toBeInTheDocument();
  });
});
