import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeftIcon, SearchIcon } from 'lucide-react';
import { navigationGroups, type Workspace } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

/** Lower case without Vietnamese accents, so "don hang" finds "Đơn hàng". */
const plain = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();

/** Every word typed must start a word of the item (its title or its group), in any order. */
function matches(value: string, search: string, keywords?: string[]) {
  const words = plain([value, ...(keywords ?? [])].join(' ')).split(/\s+/);
  const typed = plain(search).split(/\s+/).filter(Boolean);
  return typed.every((part) => words.some((word) => word.startsWith(part))) ? 1 : 0;
}

/**
 * Quick search in the workspace header (Ctrl + K / ⌘ + K): jump to any page of the sidebar menu by typing part of its
 * name, accents optional. The pages come from `navigationGroups`, so a new menu item is searchable without changes here.
 */
export function QuickSearch({ workspace }: { workspace: Exclude<Workspace, 'public'> }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="Tìm nhanh trang"
        aria-keyshortcuts="Control+K Meta+K"
        className="h-9 w-9 justify-start gap-2 rounded-full bg-card px-0 text-muted-foreground has-[>svg]:px-0 sm:w-full sm:max-w-sm sm:px-3 sm:has-[>svg]:px-3"
      >
        <SearchIcon aria-hidden="true" className="mx-auto sm:mx-0" />
        <span className="hidden flex-1 text-left text-sm font-normal sm:inline">
          Tìm trang, ví dụ "đơn hàng"…
        </span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground sm:inline">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Tìm nhanh"
        description="Gõ tên trang cần mở, có dấu hoặc không dấu."
        showCloseButton={false}
      >
        <Command filter={matches} label="Tìm nhanh trang">
          <CommandInput placeholder="Gõ tên trang, ví dụ: lich hen, khuyen mai…" />
          <CommandList>
            <CommandEmpty>Không có trang nào khớp.</CommandEmpty>
            {navigationGroups[workspace].map((group, index) => (
              <CommandGroup key={group.label ?? `group-${index}`} heading={group.label ?? 'Chung'}>
                {group.items.map(({ path, title, icon: Icon }) => (
                  <CommandItem
                    key={path}
                    value={title}
                    keywords={group.label ? [group.label] : undefined}
                    onSelect={() => go(path)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{title}</span>
                    <CornerDownLeftIcon
                      aria-hidden="true"
                      className="ml-auto opacity-0 in-data-[selected=true]:opacity-60"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
