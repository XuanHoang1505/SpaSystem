import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ChangeReviewVisibilityRequest,
  OwnerReview,
  ReplyReviewRequest,
} from '@spa/shared-types';
import { callReviews, callReviewsVoid, reviewsQueryKeys } from '@/lib/api/reviews';

interface ReplyPayload {
  id: string;
  request: ReplyReviewRequest;
}

interface VisibilityPayload {
  id: string;
  request: ChangeReviewVisibilityRequest;
}

export function useReplyReview() {
  const queryClient = useQueryClient();

  return useMutation<OwnerReview, Error, ReplyPayload>({
    mutationFn: ({ id, request }) =>
      callReviews((api) => api.reply(id, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
}

export function useRemoveReplyReview() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => callReviewsVoid((api) => api.removeReply(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
}

export function useChangeReviewVisibility() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, VisibilityPayload>({
    mutationFn: ({ id, request }) =>
      callReviewsVoid((api) => api.changeVisibility(id, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
}

export function useOwnerReviewMutations() {
  const replyReview = useReplyReview();
  const removeReply = useRemoveReplyReview();
  const changeVisibility = useChangeReviewVisibility();
  return { replyReview, removeReply, changeVisibility };
}
