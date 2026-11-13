import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@theme/index';
import { useCart } from '../hooks/useCart';

export function CartBadgeButton() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';
  const { data: cart } = useCart();

  const count = cart?.itemCount ?? 0;

  const handlePress = () => {
    if (isAuthenticated) {
      router.push('/cart');
    } else {
      router.push('/(public)/login?redirect=/cart');
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Giỏ hàng, ${count} sản phẩm`}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <ShoppingCart size={22} color={colors.primary} />
      {count > 0 && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
