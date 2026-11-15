import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SendHorizontal } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';

export interface ChatInputBarProps {
  onSend: (text: string) => void;
  isSending: boolean;
  quickPrompts: readonly string[];
}

export function ChatInputBar({ onSend, isSending, quickPrompts }: ChatInputBarProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const handlePromptPress = (prompt: string) => {
    if (isSending) return;
    onSend(prompt);
  };

  const canSend = text.trim().length > 0 && !isSending && text.length <= 1000;

  return (
    <View style={styles.container}>
      {/* Quick Prompt Chips */}
      {quickPrompts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {quickPrompts.map((prompt, idx) => (
            <Pressable
              key={idx}
              onPress={() => handlePromptPress(prompt)}
              disabled={isSending}
              style={({ pressed }) => [
                styles.promptChip,
                pressed && styles.promptChipPressed,
                isSending && styles.promptChipDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Gợi ý câu hỏi: ${prompt}`}
            >
              <AppText style={styles.promptText}>{prompt}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Hỏi trợ lý AI về dịch vụ, giá, giờ trống..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={1000}
            editable={!isSending}
            style={styles.textInput}
            accessibilityLabel="Nhập câu hỏi cho trợ lý AI"
          />
          {text.length > 0 && (
            <AppText style={styles.charCounter}>{text.length}/1000</AppText>
          )}
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            canSend ? styles.sendBtnActive : styles.sendBtnDisabled,
            pressed && canSend && styles.sendBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Gửi câu hỏi"
        >
          <SendHorizontal
            size={20}
            color={canSend ? colors.onPrimary : colors.muted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  promptsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  promptChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promptChipPressed: {
    backgroundColor: colors.primarySoft,
  },
  promptChipDisabled: {
    opacity: 0.5,
  },
  promptText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  inputWrap: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  charCounter: {
    fontSize: 10,
    color: colors.muted,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtnPressed: {
    opacity: 0.85,
  },
});
