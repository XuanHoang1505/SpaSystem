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
  type ReviewUploadFile,
} from '@/lib/api/reviews';

interface CreateReviewPayload {
  request: CreateReviewRequest;
  imageFile?: ReviewUploadFile;
}

interface UpdateReviewPayload {
  id: string;
  request: UpdateReviewRequest;
  imageFile?: ReviewUploadFile;
  removeImage?: boolean;
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation<MyReview, Error, CreateReviewPayload>({
    mutationFn: async ({ request, imageFile }) => {
      // 1. Create review
      let review = await callMyReviews((api) => api.create(request));

      // 2. Upload image if present
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
      // 1. Update rating and comment
      let review = await callMyReviews((api) => api.update(id, request));

      // 2. Remove old image or upload new image
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
