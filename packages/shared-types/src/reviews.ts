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

/** UC-SPA-30: Review status (`visible` or `hidden`). */
export type ReviewStatus = 'visible' | 'hidden';

/** Why a product cannot be reviewed by the customer. */
export type ReviewIneligibility = 'not_used_yet' | 'not_enough_sessions' | 'already_reviewed';

/** UC-SPA-30: A product the customer bought or experienced, with whether it can be reviewed now (`GET /me/reviewable`). */
export interface ReviewableProduct {
  productType: 'service' | 'package';
  productId: string;
  name: string;
  imageUrl: string | null;
  eligible: boolean;
  reason: ReviewIneligibility | null;
  reviewId: string | null;
}

/** UC-SPA-30: The signed-in customer's own review (`GET /me/reviews`). */
export interface MyReview {
  id: string;
  productType: 'service' | 'package';
  productId: string;
  productName: string;
  productImageUrl: string | null;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  status: ReviewStatus;
  ownerReply: string | null;
  repliedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  canEdit: boolean;
  editDeadlineAtUtc: string | null;
}

export interface MyReviewParams {
  pageNumber?: number;
  pageSize?: number;
}

/** Body of `POST /me/reviews`: exactly one product id. */
export interface CreateReviewRequest {
  spaServiceId?: string;
  servicePackageId?: string;
  rating: number;
  comment?: string | null;
}

/** Body of `PUT /me/reviews/{id}`. */
export interface UpdateReviewRequest {
  rating: number;
  comment?: string | null;
}

/** UC-SPA-31: Customer info in owner's review list. */
export interface OwnerReviewCustomer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
}

/** UC-SPA-31: A review in the owner's list (`GET /reviews`). */
export interface OwnerReview {
  id: string;
  productType: 'service' | 'package';
  productId: string;
  productName: string;
  customer: OwnerReviewCustomer;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  status: ReviewStatus;
  ownerReply: string | null;
  repliedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/** Filters of `GET /reviews` (UC-SPA-31). */
export interface OwnerReviewFilter {
  rating?: number;
  productType?: 'service' | 'package';
  spaServiceId?: string;
  servicePackageId?: string;
  status?: ReviewStatus;
  hasReply?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

/** Body of `POST /reviews/{id}/reply` (UC-SPA-31). */
export interface ReplyReviewRequest {
  reply: string;
}

/** Body of `PATCH /reviews/{id}/visibility` (UC-SPA-31). */
export interface ChangeReviewVisibilityRequest {
  status: ReviewStatus;
}
