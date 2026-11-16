import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ReviewUploadFile } from '@/lib/api/reviews';

export const reviewImageMaxSide = 1280;
const reviewJpegQuality = 0.85;

export const reviewImageUnreadableMessage = 'Không thể xử lý hình ảnh này. Vui lòng chọn ảnh khác.';

/**
 * Resizes and compresses a user-picked photo to standard JPEG format
 * for review attachments (max 1280px on longest side, ~200-500 KB).
 */
export async function prepareReviewImage(asset: {
  uri: string;
  width?: number;
  height?: number;
}): Promise<ReviewUploadFile> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(width, height) > reviewImageMaxSide) {
      context.resize(width >= height ? { width: reviewImageMaxSide } : { height: reviewImageMaxSide });
    }
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: reviewJpegQuality,
      });
      return { uri: saved.uri, name: 'review.jpg', type: 'image/jpeg' };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
