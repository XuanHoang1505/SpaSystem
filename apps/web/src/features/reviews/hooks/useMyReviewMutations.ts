import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateReviewRequest,
  MyReview,
  UpdateReviewRequest,
} from '@spa/shared-types';
import {
  callMyReviews,
  callMyReviewsVoid,
  reviewsQueryKeys,
} from '@/lib/api/reviews';

interface CreateReviewPayload {
  request: CreateReviewRequest;
  imageFile?: File | null;
}

interface UpdateReviewPayload {
  id: string;
  request: UpdateReviewRequest;
  imageFile?: File | null;
  removeImage?: boolean;
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation<MyReview, Error, CreateReviewPayload>({
    mutationFn: async ({ request, imageFile }) => {
      let review = await callMyReviews((api) => api.create(request));

      if (imageFile) {
        review = await callMyReviews((api) => api.uploadImage(review.id, imageFile));
      }

      return review;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation<MyReview, Error, UpdateReviewPayload>({
    mutationFn: async ({ id, request, imageFile, removeImage }) => {
      let review = await callMyReviews((api) => api.update(id, request));

      if (removeImage) {
        await callMyReviewsVoid((api) => api.deleteImage(id));
        review = { ...review, imageUrl: null };
      } else if (imageFile) {
        review = await callMyReviews((api) => api.uploadImage(id, imageFile));
      }

      return review;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
}

export function useMyReviewMutations() {
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  return { createReview, updateReview };
}
