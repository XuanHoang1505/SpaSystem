import { BadgeCheckIcon, HandHeartIcon, LeafIcon } from 'lucide-react';
import { placeholderTrustItems } from '../catalogPlaceholders';

const icons = [HandHeartIcon, BadgeCheckIcon, LeafIcon] as const;

/** Dải cam kết cuối trang dịch vụ (mẫu Stitch). Nội dung tạm, xem catalogPlaceholders. */
export function CatalogTrustStrip() {
  return (
    <section
      aria-label="Cam kết của spa"
      className="grid gap-6 rounded-xl border bg-muted/60 p-6 sm:grid-cols-3"
    >
      {placeholderTrustItems.map((item, index) => {
        const Icon = icons[index] ?? LeafIcon;
        return (
          <div key={item.title} className="flex gap-3">
            <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="font-sans text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
