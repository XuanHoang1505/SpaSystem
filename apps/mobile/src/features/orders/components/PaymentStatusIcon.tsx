import { StyleSheet, View } from 'react-native';
import type { OrderStatus, PaymentStatus } from '@spa/shared-types';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react-native';

interface PaymentStatusIconProps {
  orderStatus: OrderStatus;
  latestPaymentStatus?: PaymentStatus | null;
  size?: number;
}

export function PaymentStatusIcon({
  orderStatus,
  latestPaymentStatus,
  size = 72,
}: PaymentStatusIconProps) {
  const iconSize = Math.round(size * 0.55);

  if (orderStatus === 'paid') {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#dcfce7',
          },
        ]}
      >
        <CheckCircle2 size={iconSize} color="#15803d" />
      </View>
    );
  }

  if (
    orderStatus === 'pending_payment' &&
    latestPaymentStatus === 'failed'
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#fee2e2',
          },
        ]}
      >
        <XCircle size={iconSize} color="#b91c1c" />
      </View>
    );
  }

  if (orderStatus === 'pending_payment') {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#fef3c7',
          },
        ]}
      >
        <Clock size={iconSize} color="#b45309" />
      </View>
    );
  }

  if (orderStatus === 'expired') {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#f3f4f6',
          },
        ]}
      >
        <AlertCircle size={iconSize} color="#6b7280" />
      </View>
    );
  }

  // Cancelled or other
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#f3f4f6',
        },
      ]}
    >
      <XCircle size={iconSize} color="#6b7280" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
