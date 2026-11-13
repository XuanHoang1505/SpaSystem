import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** The avatar shows at about 104 dp, so 512 px is plenty and keeps the upload around 50-100 KB. */
export const avatarMaxSide = 512;
const avatarJpegQuality = 0.8;

/** The React Native multipart part sent as `file` (`AvatarUploadFile` in the API client). */
export type AvatarFile = { uri: string; name: string; type: string };

export const avatarUnreadableMessage = 'Không đọc được ảnh này. Vui lòng chọn ảnh khác.';

/**
 * Turns any picked photo the phone can decode (HEIC, PNG, WebP, a large JPEG) into a JPEG of at most 512 px on its
 * longest side, so the upload always passes the server's JPEG/PNG/WebP, 5 MB check.
 */
export async function prepareAvatar(asset: {
  uri: string;
  width?: number;
  height?: number;
}): Promise<AvatarFile> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(width, height) > avatarMaxSide) {
      context.resize(width >= height ? { width: avatarMaxSide } : { height: avatarMaxSide });
    }
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: avatarJpegQuality,
      });
      return { uri: saved.uri, name: 'avatar.jpg', type: 'image/jpeg' };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
