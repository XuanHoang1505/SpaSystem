import { useEffect, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface OwnerReviewFilterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  rating: string;
  onRatingChange: (rating: string) => void;
  productType: string;
  onProductTypeChange: (productType: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  hasReply: string;
  onHasReplyChange: (hasReply: string) => void;
  hasFilters: boolean;
  onReset: () => void;
}

export function OwnerReviewFilterToolbar({
  search,
  onSearchChange,
  rating,
  onRatingChange,
  productType,
  onProductTypeChange,
  status,
  onStatusChange,
  hasReply,
  onHasReplyChange,
  hasFilters,
  onReset,
}: OwnerReviewFilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Tìm kiếm đánh giá"
            placeholder="Tìm tên khách, SĐT, nội dung..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Rating Select */}
        <Select
          value={rating || 'all'}
          onValueChange={(val) => onRatingChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue placeholder="Tất cả số sao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả số sao</SelectItem>
            <SelectItem value="5">5 sao</SelectItem>
            <SelectItem value="4">4 sao</SelectItem>
            <SelectItem value="3">3 sao</SelectItem>
            <SelectItem value="2">2 sao</SelectItem>
            <SelectItem value="1">1 sao</SelectItem>
          </SelectContent>
        </Select>

        {/* Product Type Select */}
        <Select
          value={productType || 'all'}
          onValueChange={(val) => onProductTypeChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-9 w-[140px] text-sm">
            <SelectValue placeholder="Loại sản phẩm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="service">Dịch vụ lẻ</SelectItem>
            <SelectItem value="package">Gói dịch vụ</SelectItem>
          </SelectContent>
        </Select>

        {/* Visibility Status Select */}
        <Select
          value={status || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="visible">Đang hiển thị</SelectItem>
            <SelectItem value="hidden">Đã ẩn</SelectItem>
          </SelectContent>
        </Select>

        {/* Reply Status Select */}
        <Select
          value={hasReply || 'all'}
          onValueChange={(val) => onHasReplyChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <SelectValue placeholder="Phản hồi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phản hồi</SelectItem>
            <SelectItem value="true">Đã phản hồi</SelectItem>
            <SelectItem value="false">Chưa phản hồi</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Button */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="mr-1 size-3.5" aria-hidden="true" />
            Đặt lại
          </Button>
        )}
      </div>
    </div>
  );
}

/** Alias to support legacy/backwards compatibility */
export { OwnerReviewFilterToolbar as OwnerReviewFilterBar };
