import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Search, X } from 'lucide-react-native';

interface Props {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function CareHistorySearchBar({
  value,
  onChange,
  placeholder = 'Tìm tên hoặc số điện thoại khách...',
}: Props) {
  const [localText, setLocalText] = useState(value);

  // Sync external value when changed
  useEffect(() => {
    setLocalText(value);
  }, [value]);

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localText !== value) {
        onChange(localText);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localText, onChange, value]);

  const handleClear = () => {
    setLocalText('');
    onChange('');
  };

  return (
    <View style={styles.container}>
      <Search size={18} color={colors.muted} />
      <TextInput
        value={localText}
        onChangeText={setLocalText}
        placeholder={placeholder}
        placeholderTextColor={colors.tabBarInactive}
        style={styles.input}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localText.length > 0 ? (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Xóa từ khóa tìm kiếm"
        >
          <X size={16} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
});
