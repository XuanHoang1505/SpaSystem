import { Pressable, StyleSheet, View } from 'react-native';
import { AlertCircle, Bot, RotateCcw } from 'lucide-react-native';
import type { ChatItem } from '../hooks/useAiChat';
import { AppText } from '@components/common/AppText';
import { AiProductSuggestionCard } from './AiProductSuggestionCard';
import { AiBookingProposalCard } from './AiBookingProposalCard';
import { colors, radius, spacing } from '@theme/index';

export interface ChatMessageBubbleProps {
  message: ChatItem;
  onRetry?: (failedQuestion: string) => void;
}

export function ChatMessageBubble({ message, onRetry }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.isError);

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <AppText style={styles.userText}>{message.content}</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.avatar, isError && styles.avatarError]}>
        {isError ? (
          <AlertCircle size={16} color={colors.error} />
        ) : (
          <Bot size={16} color={colors.primary} />
        )}
      </View>

      <View style={styles.assistantContentCol}>
        <View style={[styles.assistantBubble, isError && styles.errorBubble]}>
          <AppText style={[styles.assistantText, isError && styles.errorText]}>
            {message.content}
          </AppText>

          {isError && message.failedQuestion && onRetry && (
            <Pressable
              onPress={() => onRetry(message.failedQuestion!)}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Thử gửi lại câu hỏi"
            >
              <RotateCcw size={14} color={colors.error} />
              <AppText style={styles.retryText}>Thử gửi lại</AppText>
            </Pressable>
          )}
        </View>

        {/* Product suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <View style={styles.cardsWrap}>
            <AppText style={styles.cardsHeader}>Sản phẩm phù hợp gợi ý cho bạn:</AppText>
            {message.suggestions.map((suggestion) => (
              <AiProductSuggestionCard key={suggestion.productId} suggestion={suggestion} />
            ))}
          </View>
        )}

        {/* Booking proposals */}
        {message.bookingProposals && message.bookingProposals.length > 0 && (
          <View style={styles.cardsWrap}>
            <AppText style={styles.cardsHeader}>Khung giờ trống đề xuất:</AppText>
            {message.bookingProposals.map((proposal, idx) => (
              <AiBookingProposalCard key={`${proposal.date}-${proposal.startTime}-${idx}`} proposal={proposal} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    borderBottomRightRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.onPrimary,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarError: {
    backgroundColor: colors.errorSoft,
  },
  assistantContentCol: {
    flex: 1,
    maxWidth: '88%',
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBubble: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.errorBorder,
  },
  assistantText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  errorText: {
    color: colors.error,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs + 2,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.small,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  cardsWrap: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  cardsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 4,
    marginBottom: 2,
  },
});
