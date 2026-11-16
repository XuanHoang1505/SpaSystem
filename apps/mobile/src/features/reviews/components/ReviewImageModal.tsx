import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export function ReviewImageModal({ imageUrl, onClose }: Props) {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={Boolean(imageUrl)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Đóng ảnh"
          hitSlop={12}
        >
          <X size={24} color="#FFF" />
        </Pressable>

        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel="Ảnh trải nghiệm từ khách hàng"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '80%',
  },
});
