import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, SparklesIcon } from 'lucide-react';
import type { ServiceCategory } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useServiceCategories } from '@/features/services';
import { cn } from '@/lib/utils';
import { demoPhotoFor } from '../homeDemoContent';
import { HomeSection } from './HomeSection';

const maxTiles = 5;

/**
 * Tile spans on a 4 x 2 desktop grid, chosen so N categories fill it exactly (no empty cell): the first tile is the
 * large one, the rest share what is left.
 */
const desktopSpans: Record<number, string[]> = {
  1: ['md:col-span-4 md:row-span-2'],
  2: ['md:col-span-2 md:row-span-2', 'md:col-span-2 md:row-span-2'],
  3: ['md:col-span-2 md:row-span-2', 'md:col-span-2', 'md:col-span-2'],
  4: ['md:col-span-2 md:row-span-2', 'md:col-span-2', 'md:col-span-1', 'md:col-span-1'],
  5: [
    'md:col-span-2 md:row-span-2',
    'md:col-span-1',
    'md:col-span-1',
    'md:col-span-1',
    'md:col-span-1',
  ],
};

/** Categories as an asymmetric photo bento: one large tile and smaller ones around it. */
export function CategoryShowcase() {
  const query = useServiceCategories();
  const categories = (query.data ?? [])
    .filter((category) => category.isActive && category.serviceCount > 0)
    .slice(0, maxTiles);

  return (
    <HomeSection
      id="home-categories"
      badge="Danh mục liệu pháp"
      title="Chọn liệu pháp hợp với bạn"
      description="Từ chăm sóc da mặt đến thư giãn toàn thân, mỗi nhóm dịch vụ được thiết kế cho một nhu cầu riêng."
      seeAllTo="/services"
      seeAllLabel="Tất cả dịch vụ"
    >
      {query.isPending ? (
        <div
          className="grid h-[420px] grid-cols-4 grid-rows-2 gap-4"
          aria-label="Đang tải danh mục"
        >
          <Skeleton className="col-span-2 row-span-2 rounded-sm" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="rounded-sm" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Không tải được danh mục.
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <p className="rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Spa đang cập nhật danh mục dịch vụ.
        </p>
      ) : (
        <ul className="grid auto-rows-[200px] grid-cols-2 gap-4 md:h-[440px] md:auto-rows-auto md:grid-cols-4 md:grid-rows-2">
          {categories.map((category, index) => (
            <CategoryTile
              key={category.id}
              category={category}
              index={index}
              count={categories.length}
              span={desktopSpans[categories.length]?.[index] ?? ''}
            />
          ))}
        </ul>
      )}
    </HomeSection>
  );
}

function CategoryTile({
  category,
  index,
  count,
  span,
}: {
  category: ServiceCategory;
  index: number;
  count: number;
  span: string;
}) {
  const large = index === 0;
  // Two columns on phones, the first tile full width: the last one also goes full width when the rest is odd.
  const fullOnPhone = large || (index === count - 1 && (count - 1) % 2 === 1);
  return (
    <li className={cn(fullOnPhone && 'col-span-2', span)}>
      <Link
        to={`/services?categoryId=${category.id}`}
        className="group relative block size-full overflow-hidden rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ImageWithFallback
          src={demoPhotoFor(category.name, index)}
          alt=""
          fallbackIcon={SparklesIcon}
          className="size-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
        />
        {/* Scrim so the white label stays readable on any photo. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/15 to-transparent"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-primary-foreground">
          <span>
            <span
              className={cn(
                'block font-heading leading-tight',
                large ? 'text-2xl md:text-3xl' : 'text-lg',
              )}
            >
              {category.name}
            </span>
            <span className="text-sm text-primary-foreground/80">
              {category.serviceCount} dịch vụ
            </span>
          </span>
          <span className="shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5">
            <ArrowUpRightIcon className="size-4" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}
