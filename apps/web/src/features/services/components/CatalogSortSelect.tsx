import { useId } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { catalogSortLabels, type CatalogSortOption } from '../hooks/useCatalogListParams';

const options = Object.keys(catalogSortLabels) as CatalogSortOption[];
const isSortOption = (value: string): value is CatalogSortOption =>
  (options as string[]).includes(value);

export function CatalogSortSelect({
  value,
  onChange,
}: {
  value: CatalogSortOption;
  onChange: (value: CatalogSortOption) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={id}
        className="text-sm whitespace-nowrap text-muted-foreground max-sm:sr-only"
      >
        Sắp xếp
      </Label>
      <Select value={value} onValueChange={(next) => isSortOption(next) && onChange(next)}>
        <SelectTrigger id={id} className="w-36 bg-card sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {catalogSortLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
