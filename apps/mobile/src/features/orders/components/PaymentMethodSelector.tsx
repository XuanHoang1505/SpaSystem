import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { CheckCircle2, Circle, CreditCard, ShieldCheck } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';

type LogoFit = 'cover' | 'contain' | 'zoom';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  logo: ImageSourcePropType;
  /** `zoom` crops the white margin around the VNPay wordmark; `contain` keeps wide black logos inside the tile. */
  fit: LogoFit;
  available: boolean;
}

/** Same set as the web checkout. Only VNPay is wired to the API. */
// Metro bundles an image only from a static require().
/* eslint-disable @typescript-eslint/no-require-imports */
const paymentMethods: readonly PaymentMethod[] = [
  {
    id: 'vnpay',
    name: 'Cổng thanh toán VNPay',
    description: 'Hỗ trợ quét mã VNPAY-QR, thẻ ATM nội địa, Visa, Mastercard',
    logo: require('@/assets/images/vnpay_icon.png'),
    fit: 'zoom',
    available: true,
  },
  {
    id: 'momo',
    name: 'Ví điện tử MoMo',
    description: 'Thanh toán nhanh bằng ví điện tử MoMo.',
    logo: require('@/assets/images/momo_icon.png'),
    fit: 'cover',
    available: false,
  },
  {
    id: 'zalopay',
    name: 'Ví ZaloPay',
    description: 'Thanh toán bằng ví ZaloPay.',
    logo: require('@/assets/images/zalopay_icon.png'),
    fit: 'contain',
    available: false,
  },
  {
    id: 'card',
    name: 'Thẻ quốc tế',
    description: 'Thẻ Visa, Mastercard hoặc JCB.',
    logo: require('@/assets/images/visa.png'),
    fit: 'contain',
    available: false,
  },
];
/* eslint-enable @typescript-eslint/no-require-imports */

function PaymentLogo({ method }: { method: PaymentMethod }) {
  const frame = {
    cover: styles.logoCover,
    contain: styles.logoContain,
    zoom: styles.logoZoom,
  }[method.fit];

  return (
    <View style={styles.logoTile}>
      <Image
        source={method.logo}
        style={frame}
        resizeMode={method.fit === 'cover' ? 'cover' : 'contain'}
        accessible={false}
      />
    </View>
  );
}

export function PaymentMethodSelector() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CreditCard size={18} color={colors.primary} />
        <AppText style={styles.title}>Phương thức thanh toán</AppText>
      </View>

      {paymentMethods.map((method) => (
        <View
          key={method.id}
          style={[
            styles.methodItem,
            method.available ? styles.methodItemActive : styles.methodItemDisabled,
          ]}
        >
          <View style={styles.radioCol}>
            {method.available ? (
              <CheckCircle2 size={20} color={colors.primary} />
            ) : (
              <Circle size={20} color={colors.muted} />
            )}
          </View>
          <PaymentLogo method={method} />
          <View style={styles.infoCol}>
            <View style={styles.labelRow}>
              <AppText style={[styles.methodName, !method.available && styles.textDisabled]}>
                {method.name}
              </AppText>
              {method.available ? (
                <View style={styles.recommendedBadge}>
                  <AppText style={styles.recommendedText}>Khuyên dùng</AppText>
                </View>
              ) : (
                <View style={styles.comingSoonBadge}>
                  <AppText style={styles.comingSoonText}>Sắp có</AppText>
                </View>
              )}
            </View>
            <AppText style={styles.methodDesc}>{method.description}</AppText>
          </View>
          {method.available && <ShieldCheck size={20} color={colors.success} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.onPrimary,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  methodItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#fdf8f6',
  },
  methodItemDisabled: {
    backgroundColor: '#fafafa',
    borderColor: '#eee',
    opacity: 0.6,
  },
  radioCol: {
    marginRight: 4,
  },
  logoTile: {
    width: 48,
    height: 48,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onPrimary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCover: {
    width: 48,
    height: 48,
  },
  logoZoom: {
    width: 56,
    height: 56,
  },
  logoContain: {
    width: 36,
    height: 36,
  },
  infoCol: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  methodDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  recommendedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  comingSoonBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  textDisabled: {
    color: colors.muted,
  },
});
