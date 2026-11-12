import { useEffect, useRef } from 'react';
import { Bot, Sparkles, Loader2 } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAiChat } from '../hooks/useAiChat';
import { AiMedicalDisclaimer } from './AiMedicalDisclaimer';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInputBar } from './ChatInputBar';

interface AiChatViewProps {
  compact?: boolean;
}

export function AiChatView({ compact = false }: AiChatViewProps) {
  useDocumentTitle('Trợ lý AI tư vấn dịch vụ');
  const { messages, sendMessage, isSending, isLoadingHistory, isAuthenticated } = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ${
        compact ? 'h-[540px]' : 'h-[calc(100vh-12rem)] min-h-[580px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
              Trợ lý ảo Như Nguyệt Spa
            </h2>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Sẵn sàng
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Tư vấn dịch vụ · Bảng giá · Tra cứu giờ trống · Gợi ý đặt lịch
          </p>
        </div>
      </div>

      {/* Main Chat Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <AiMedicalDisclaimer />

        {isLoadingHistory && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Đang tải lịch sử trò chuyện...
          </div>
        )}

        <div className="space-y-4 pt-2">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}

          {isSending && (
            <div className="mr-auto flex max-w-[80%] items-center gap-3">
              <div className="flex size-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-border bg-muted/60 p-3.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Trợ lý đang tìm kiếm thông tin và soạn câu trả lời...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Bar */}
      <ChatInputBar
        onSend={sendMessage}
        isSending={isSending}
        isAuthenticated={isAuthenticated}
        showQuickPrompts={messages.length <= 1}
      />
    </div>
  );
}
