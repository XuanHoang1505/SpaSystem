import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageIcon, SearchIcon, SparklesIcon, XIcon } from 'lucide-react';
import type { CatalogSuggestion } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { cn } from '@/lib/utils';
import { useCatalogSuggestions } from '../hooks/useCatalogSuggestions';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const DEBOUNCE_MS = 300;
const MAX_LENGTH = 100;

const SEARCH_ROW = 'search';
const keyOf = (item: CatalogSuggestion) => `${item.type}-${item.id}`;
const pathOf = (item: CatalogSuggestion) =>
  `/${item.type === 'service' ? 'services' : 'packages'}/${item.id}`;

/**
 * UC-SPA-06 A1: ô tìm kiếm có gợi ý (ARIA combobox). Chọn gợi ý → mở chi tiết;
 * Enter hoặc dòng "Tìm …" → `onSearch` với từ khóa đã bỏ khoảng trắng.
 */
export function CatalogSearchBox({
  defaultValue,
  onSearch,
  placeholder,
  label,
}: {
  defaultValue: string;
  onSearch: (term: string) => void;
  placeholder: string;
  label: string;
}) {
  const navigate = useNavigate();
  const listboxId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  // Dòng đang chọn theo khóa (không theo vị trí): khi gợi ý về, dòng "Tìm …" vẫn là dòng "Tìm …".
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const term = text.trim();
  const settledTerm = useDebouncedValue(term, DEBOUNCE_MS);
  const settled = settledTerm === term;
  const query = useCatalogSuggestions(settledTerm);

  const suggestions = settled && query.data ? query.data : [];
  const keys = [...suggestions.map(keyOf), SEARCH_ROW];
  const active = activeKey === null ? -1 : keys.indexOf(activeKey);
  const expanded = open && term.length >= 2;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  function search() {
    setOpen(false);
    setActiveKey(null);
    onSearch(term);
  }

  function choose(index: number) {
    const item = suggestions[index];
    if (!item) return search();
    setOpen(false);
    navigate(pathOf(item));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!expanded) return setOpen(true);
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (active + step + keys.length) % keys.length;
      setActiveKey(keys[next] ?? null);
    } else if (event.key === 'Enter') {
      // Enter chốt chữ của bộ gõ (ví dụ Telex trên macOS) thì không tìm.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      if (expanded && active >= 0) choose(active);
      else search();
    } else if (event.key === 'Escape') {
      if (expanded) {
        setOpen(false);
        setActiveKey(null);
      } else setText('');
    }
  }

  return (
    <Popover open={expanded} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative w-full">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            role="combobox"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            maxLength={MAX_LENGTH}
            placeholder={placeholder}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
              setActiveKey(null);
            }}
            onKeyDown={onKeyDown}
            className="h-11 rounded-full bg-card pr-11 pl-10"
          />
          {text && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xóa từ khóa"
              onClick={() => {
                setText('');
                setOpen(false);
              }}
              className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2 rounded-full"
            >
              <XIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          // Bấm vào chính ô nhập không đóng danh sách.
          if (event.target instanceof Node && anchorRef.current?.contains(event.target))
            event.preventDefault();
        }}
      >
        <ul id={listboxId} role="listbox" aria-label={`Gợi ý cho “${term}”`}>
          {(!settled || query.isFetching) && suggestions.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              Đang tìm…
            </li>
          )}
          {settled && query.isError && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              Không tải được gợi ý
            </li>
          )}
          {suggestions.map((item, index) => (
            <li
              key={keyOf(item)}
              id={optionId(index)}
              role="option"
              aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm',
                active === index && 'bg-accent text-accent-foreground',
              )}
            >
              <ImageWithFallback
                src={item.imageUrl}
                alt=""
                fallbackIcon={item.type === 'service' ? SparklesIcon : PackageIcon}
                className="size-8 shrink-0 rounded-md"
              />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>{' '}
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.type === 'service' ? 'Dịch vụ' : 'Gói'}
              </span>
            </li>
          ))}
          <li
            id={optionId(suggestions.length)}
            role="option"
            aria-selected={active === suggestions.length}
            onMouseDown={(event) => event.preventDefault()}
            onClick={search}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-primary',
              active === suggestions.length && 'bg-accent',
            )}
          >
            <SearchIcon className="size-4" aria-hidden="true" />
            {`Tìm “${term}”`}
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
