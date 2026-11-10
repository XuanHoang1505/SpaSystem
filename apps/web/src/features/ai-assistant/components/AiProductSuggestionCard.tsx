import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
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
      className="group block p-3 rounded-lg border bg-card text-card-foreground hover:border-primary/50 hover:shadow-sm transition-all text-left"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <Badge variant={isPackage ? 'secondary' : 'outline'} className="text-[11px] px-2 py-0">
          {isPackage ? 'Gói dịch vụ' : 'Dịch vụ lẻ'}
        </Badge>
        <span className="text-xs font-semibold text-primary">
          {formatCurrency(suggestion.price)}
        </span>
      </div>

      <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between gap-2">
        <span className="line-clamp-1">{suggestion.name}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
