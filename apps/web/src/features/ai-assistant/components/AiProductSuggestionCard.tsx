import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { AiProductSuggestion } from '@spa/shared-types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatting/formatters';

interface AiProductSuggestionCardProps {
  suggestion: AiProductSuggestion;
}

export function AiProductSuggestionCard({ suggestion }: AiProductSuggestionCardProps) {
  const isPackage = suggestion.productType === 'package';

  return (
    <Link
      to={suggestion.path}
      className="group block rounded-lg border bg-card p-3 text-left text-card-foreground transition-all hover:border-primary/50 hover:shadow-sm"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Badge variant={isPackage ? 'secondary' : 'outline'} className="px-2 py-0 text-[11px]">
          {isPackage ? 'Gói dịch vụ' : 'Dịch vụ lẻ'}
        </Badge>
        <span className="text-xs font-semibold text-primary">
          {formatCurrency(suggestion.price)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
        <span className="line-clamp-1">{suggestion.name}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
