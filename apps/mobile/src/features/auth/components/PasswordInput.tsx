import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { AppInput } from '@components/common/AppInput';
import { colors } from '@theme/index';

/** A password field with an icon button that shows or hides the text (48dp, labelled for screen readers). */
export function PasswordInput(
  props: Omit<ComponentProps<typeof AppInput>, 'secureTextEntry' | 'trailing'>,
) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <AppInput
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          onPress={() => setVisible((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          accessibilityState={{ selected: visible }}
          style={styles.toggle}
        >
          <Icon color={colors.muted} size={20} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
