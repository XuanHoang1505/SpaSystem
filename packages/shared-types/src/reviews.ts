import type { PagedResponse } from './index';

/** UC-SPA-29: average (1 decimal, null without reviews), count and per-star counts "1".."5" of visible reviews. */
export interface RatingSummary {
  averageRating: number | null;
  reviewCount: number;
  ratingCounts: Readonly<Record<string, number>>;
}

/** One visible review of a service or package, as shown to everyone (`reviewerName` is the full name, Q-77). */
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  reviewerName: string;
  createdAtUtc: string;
  ownerReply: string | null;
  repliedAtUtc: string | null;
}

/** `GET /services/{id}/reviews`, `GET /packages/{id}/reviews`: summary of every visible review plus one page. */
export interface ProductReviews {
  summary: RatingSummary;
  page: PagedResponse<PublicReview>;
}

export interface ProductReviewParams {
  pageNumber?: number;
  pageSize?: number;
  /** Only reviews with this many stars (1-5). */
  rating?: number;
}
