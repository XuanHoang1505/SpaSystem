import { MoreHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DataTableRowAction } from './dataTable.types';

export function DataTableRowActions<TData>({
  row,
  actions,
}: {
  row: TData;
  actions: readonly DataTableRowAction<TData>[];
}) {
  if (actions.length === 0) return null;
  return (
    // Chặn sự kiện để click vào menu không kích hoạt onRowClick của dòng.
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map(({ label, icon: Icon, onSelect, variant, disabled }) => (
            <DropdownMenuItem
              key={label}
              variant={variant}
              disabled={disabled}
              onSelect={() => onSelect(row)}
            >
              {Icon && <Icon aria-hidden="true" />}
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
