import { useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bot, LogIn, RotateCcw } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { AppScreen } from '@components/common/AppScreen';
import { useAiChat } from '../hooks/useAiChat';
import { AiMedicalDisclaimer } from '../components/AiMedicalDisclaimer';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { ChatInputBar } from '../components/ChatInputBar';
import { CUSTOMER_QUICK_PROMPTS, GUEST_QUICK_PROMPTS } from '../schemas';
import { colors, radius, spacing } from '@theme/index';

export function AiAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    sendMessage,
    retryMessage,
    resetChat,
    isSending,
    isAuthenticated,
  } = useAiChat();

  const quickPrompts = useMemo(
    () => (isAuthenticated ? CUSTOMER_QUICK_PROMPTS : GUEST_QUICK_PROMPTS),
    [isAuthenticated],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/home');
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isSending]);

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 1. Standalone Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerAvatar}>
              <Bot size={18} color={colors.primary} />
            </View>
            <View style={styles.headerTextCol}>
              <AppText style={styles.headerTitle}>Trợ lý AI Như Nguyệt</AppText>
              <AppText style={styles.headerSubtitle}>Tư vấn dịch vụ &amp; đặt lịch</AppText>
            </View>
          </View>

          <Pressable
            onPress={resetChat}
            accessibilityRole="button"
            accessibilityLabel="Làm mới cuộc trò chuyện"
            hitSlop={8}
            style={styles.refreshBtn}
          >
            <RotateCcw size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* 2. Medical Disclaimer Banner */}
        <AiMedicalDisclaimer />

        {/* 3. Guest Banner (if unauthenticated) */}
        {!isAuthenticated && (
          <Pressable
            onPress={() => router.push('/(public)/login?redirect=/(customer)/ai-assistant')}
            style={styles.guestBanner}
            accessibilityRole="button"
            accessibilityLabel="Đăng nhập để tra cứu lịch hẹn và tiến độ gói"
          >
            <LogIn size={15} color={colors.primary} />
            <AppText style={styles.guestBannerText}>
              Đăng nhập để tra cứu lịch hẹn &amp; số buổi gói của bạn →
            </AppText>
          </Pressable>
        )}

        {/* 4. Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessageBubble message={item} onRetry={retryMessage} />
          )}
          ListFooterComponent={isSending ? <TypingIndicator /> : null}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: spacing.sm },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* 5. Bottom Input Bar */}
        <View style={{ paddingBottom: Math.max(insets.bottom, spacing.xs) }}>
          <ChatInputBar
            onSend={sendMessage}
            isSending={isSending}
            quickPrompts={quickPrompts}
          />
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginHorizontal: spacing.xs,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 6,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  guestBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
});
