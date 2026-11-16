import { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Star, Camera, Trash2, X, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiClientError } from '@spa/api-client';
import type { MyReview, ReviewableProduct } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { colors } from '@/theme/colors';
import { toast } from '@/stores/toastStore';
import { reviewFormSchema } from '../schemas';
import { ratingEmotionLabels } from '../utils/reviewHelpers';
import { prepareReviewImage, reviewImageUnreadableMessage } from '../utils/reviewImage';
import { useCreateReview, useUpdateReview } from '../hooks/useReviewMutations';
import type { ReviewUploadFile } from '@/lib/api/reviews';

export interface ReviewFormModalProps {
  visible: boolean;
  onClose: () => void;
  targetProduct?: ReviewableProduct | null;
  existingReview?: MyReview | null;
  onSuccess?: () => void;
}

export function ReviewFormModal({
  visible,
  onClose,
  targetProduct,
  existingReview,
  onSuccess,
}: ReviewFormModalProps) {
  const isEditing = Boolean(existingReview);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<ReviewUploadFile | undefined>(undefined);
  const [removeExistingImage, setRemoveExistingImage] = useState<boolean>(false);
  const [pickingImage, setPickingImage] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (visible) {
      if (existingReview) {
        setRating(existingReview.rating);
        setComment(existingReview.comment ?? '');
        setImageUri(existingReview.imageUrl ?? null);
        setImageFile(undefined);
        setRemoveExistingImage(false);
      } else {
        setRating(5);
        setComment('');
        setImageUri(null);
        setImageFile(undefined);
        setRemoveExistingImage(false);
      }
      setErrorMsg(null);
    }
  }, [visible, existingReview, targetProduct]);

  const productName = existingReview?.productName ?? targetProduct?.name ?? '';
  const productType = existingReview?.productType ?? targetProduct?.productType ?? 'service';
  const isPackage = productType === 'package';

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error('Ứng dụng cần quyền thư viện ảnh để đính kèm hình ảnh.');
        return;
      }

      setPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) return;

      const prepared = await prepareReviewImage(result.assets[0]);
      setImageFile(prepared);
      setImageUri('uri' in prepared ? prepared.uri : result.assets[0].uri);
      setRemoveExistingImage(false);
    } catch {
      toast.error(reviewImageUnreadableMessage);
    } finally {
      setPickingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setImageFile(undefined);
    if (isEditing && existingReview?.imageUrl) {
      setRemoveExistingImage(true);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    // Validate form inputs
    const parsed = reviewFormSchema.safeParse({
      rating,
      comment: comment.trim() || undefined,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Thông tin đánh giá không hợp lệ.');
      return;
    }

    try {
      if (isEditing && existingReview) {
        await updateMutation.mutateAsync({
          id: existingReview.id,
          request: {
            rating: parsed.data.rating,
            comment: parsed.data.comment ?? null,
          },
          imageFile,
          removeImage: removeExistingImage,
        });
        toast.success('Đã cập nhật đánh giá của bạn.');
      } else if (targetProduct) {
        const createBody =
          targetProduct.productType === 'package'
            ? {
                servicePackageId: targetProduct.productId,
                rating: parsed.data.rating,
                comment: parsed.data.comment ?? null,
              }
            : {
                spaServiceId: targetProduct.productId,
                rating: parsed.data.rating,
                comment: parsed.data.comment ?? null,
              };

        await createMutation.mutateAsync({
          request: createBody,
          imageFile,
        });
        toast.success('Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.');
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const firstError = err.errors[0];
        if (firstError) {
          switch (firstError.code) {
            case 'review_not_eligible':
              setErrorMsg('Bạn chưa đủ điều kiện đánh giá (cần hoàn thành ít nhất 1 buổi).');
              return;
            case 'review_exists':
              setErrorMsg('Bạn đã gửi đánh giá cho dịch vụ/gói này trước đó.');
              return;
            case 'review_locked':
              setErrorMsg('Đã hết thời hạn 30 ngày chỉnh sửa hoặc đánh giá đã được phản hồi.');
              return;
            case 'validation_error':
              setErrorMsg(firstError.message || 'Dữ liệu đánh giá không hợp lệ.');
              return;
            default:
              setErrorMsg(firstError.message || 'Không thể lưu đánh giá.');
              return;
          }
        }
      }
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu đánh giá. Vui lòng thử lại sau.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <AppText style={styles.title}>
                {isEditing ? 'Chỉnh sửa đánh giá' : 'Đánh giá dịch vụ'}
              </AppText>
              <AppText style={styles.subtitle} numberOfLines={1}>
                {isPackage ? 'Gói' : 'Dịch vụ'}: {productName}
              </AppText>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Đóng hộp thoại"
              hitSlop={8}
            >
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <AlertCircle size={18} color={colors.error} style={styles.errorIcon} />
                <AppText style={styles.errorBannerText}>{errorMsg}</AppText>
              </View>
            ) : null}

            {/* Rating Stars Section */}
            <View style={styles.ratingSection}>
              <AppText style={styles.label}>
                Mức độ hài lòng của bạn <AppText style={styles.required}>*</AppText>
              </AppText>

              <View
                style={styles.starsRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Chọn số sao đánh giá"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starTouch}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: rating === star }}
                    accessibilityLabel={`${star} sao`}
                    hitSlop={8}
                  >
                    <Star
                      size={36}
                      color={star <= rating ? '#F59E0B' : colors.border}
                      fill={star <= rating ? '#F59E0B' : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>

              <AppText style={styles.emotionText}>
                {ratingEmotionLabels[rating] ?? ''}
              </AppText>
            </View>

            {/* Comment Section */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <AppText style={styles.label}>Nhận xét của bạn</AppText>
                <AppText style={[styles.charCount, comment.length > 950 && styles.charCountWarning]}>
                  {comment.length}/1000
                </AppText>
              </View>

              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ, tay nghề kỹ thuật viên, không gian spa..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
                accessibilityLabel="Nội dung đánh giá"
              />
            </View>

            {/* Image Attachment Section */}
            <View style={styles.formGroup}>
              <AppText style={styles.label}>Hình ảnh thực tế (tối đa 1 ảnh)</AppText>

              {imageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <Pressable
                    onPress={handleRemoveImage}
                    style={styles.removeImageBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Gỡ hình ảnh"
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={colors.error} />
                    <AppText style={styles.removeImageText}>Gỡ ảnh</AppText>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickImage}
                  style={styles.pickImageBtn}
                  disabled={pickingImage}
                  accessibilityRole="button"
                  accessibilityLabel="Chọn ảnh từ thư viện"
                >
                  {pickingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Camera size={20} color={colors.primary} />
                      <AppText style={styles.pickImageText}>Thêm hình ảnh thực tế</AppText>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <View style={styles.footerBtnCol}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={onClose}
                disabled={isSubmitting}
              />
            </View>

            <View style={styles.footerBtnCol}>
              <AppButton
                title={isEditing ? 'Cập nhật' : 'Gửi đánh giá'}
                variant="primary"
                onPress={handleSubmit}
                loading={isSubmitting}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingVertical: 16,
    gap: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 10,
    padding: 12,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 10,
  },
  starTouch: {
    padding: 4,
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 2,
  },
  formGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: colors.muted,
  },
  charCountWarning: {
    color: '#D97706',
    fontWeight: '600',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  imagePreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.errorSoft,
  },
  removeImageText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pickImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerBtnCol: {
    flex: 1,
  },
});
