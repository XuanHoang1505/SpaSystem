import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { AppInput } from '@components/common/AppInput';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors } from '@theme/index';

function vietnamToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DateOfBirthField({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [year, month, day] = vietnamToday().split('-').map(Number);
  const maximumDate = new Date(year ?? 1900, (month ?? 1) - 1, day ?? 1, 23, 59, 59);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ngày sinh"
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <View pointerEvents="none">
          <AppInput
            label="Ngày sinh"
            hideLabel
            dim={false}
            editable={false}
            value={value ? formatLocalDate(value) : ''}
            placeholder="Chưa cập nhật"
            error={error}
            // With a date, the slot is left empty for the clear button laid over it.
            trailing={
              <View style={styles.trailing}>
                {value ? null : <Calendar size={18} color={colors.muted} />}
              </View>
            }
          />
        </View>
      </Pressable>
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xóa ngày sinh"
          disabled={disabled}
          onPress={() => onChange(null)}
          style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
        >
          <X size={18} color={colors.muted} />
        </Pressable>
      ) : null}
      {open && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          minimumDate={new Date(1900, 0, 1)}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setOpen(false);
            // Android also calls onChange on Cancel, with the picker's starting date (today when empty); keep the value.
            if (event.type === 'set' && date) onChange(toIsoDate(date));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 48 dp square on the right of the 48 dp high box: the calendar icon, or the clear button over it.
  trailing: { width: 48, alignItems: 'center', justifyContent: 'center' },
  clear: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearPressed: { opacity: 0.5 },
});
