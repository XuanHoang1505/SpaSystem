import { useState, useCallback, useEffect } from 'react';
import type { AiBookingProposal, AiProductSuggestion } from '@spa/shared-types';
import { ApiClientError } from '@spa/api-client';
import { callAiAssistant } from '@/lib/api/aiAssistant';
import { useAuthStore } from '@/stores/authStore';
import { useAiHistory } from './useAiHistory';

export interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: readonly AiProductSuggestion[];
  bookingProposals?: readonly AiBookingProposal[];
  createdAt: string;
  isError?: boolean;
}

const WELCOME_MESSAGE: ChatItem = {
  id: 'welcome-0',
  role: 'assistant',
  content:
    'Xin chào! Tôi là Trợ lý ảo Như Nguyệt Spa 🌸\nTôi có thể hỗ trợ bạn tìm kiếm và tư vấn dịch vụ, bảng giá, kiểm tra khung giờ trống và gợi ý lịch hẹn phù hợp nhất. Bạn cần tìm hiểu thông tin gì hôm nay?',
  createdAt: new Date().toISOString(),
};

export function useAiChat() {
  const { user, status } = useAuthStore();
  const isAuthenticated = status === 'authenticated' && user?.role === 'customer';

  const { data: historyData, isLoading: isLoadingHistory } = useAiHistory(
    undefined,
    isAuthenticated,
  );

  const [messages, setMessages] = useState<ChatItem[]>([WELCOME_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (historyData?.items && !historyLoaded) {
      if (historyData.items.length > 0) {
        const historyItems: ChatItem[] = [];
        const chronological = [...historyData.items].reverse();
        for (const item of chronological) {
          historyItems.push({
            id: `q-${item.id}`,
            role: 'user',
            content: item.question,
            createdAt: item.createdAtUtc,
          });
          historyItems.push({
            id: `a-${item.id}`,
            role: 'assistant',
            content: item.answer,
            createdAt: item.createdAtUtc,
          });
        }
        setMessages([WELCOME_MESSAGE, ...historyItems]);
      }
      setHistoryLoaded(true);
    }
  }, [historyData, historyLoaded]);

  const sendMessage = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatItem = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await callAiAssistant((api) => api.chat({ question: trimmed }));
      const assistantMessage: ChatItem = {
        id: response.messageId ?? `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        suggestions: response.suggestions,
        bookingProposals: response.bookingProposals,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      let errorMessage = 'Rất tiếc, đã có lỗi xảy ra trong quá trình phản hồi. Vui lòng thử lại.';
      if (error instanceof ApiClientError) {
        if (error.status === 429) {
          errorMessage = 'Bạn đang thao tác quá nhanh, vui lòng chờ ít phút trước khi hỏi tiếp.';
        } else if (error.status === 503) {
          errorMessage = 'Dịch vụ trợ lý AI tạm thời gián đoạn. Vui lòng thử lại sau ít phút.';
        } else if (error.status === 403) {
          errorMessage = 'Tính năng tư vấn AI chỉ dành cho khách hàng và khách vãng lai.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      const errorItem: ChatItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        createdAt: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorItem]);
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    messages,
    sendMessage,
    isSending,
    isLoadingHistory,
    isAuthenticated,
  };
}
