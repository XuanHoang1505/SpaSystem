import { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  isSending: boolean;
  isAuthenticated?: boolean;
  showQuickPrompts?: boolean;
}

const PUBLIC_PROMPTS = [
  'Tư vấn dịch vụ cho da nhạy cảm',
  'Các gói cấp ẩm phục hồi da',
  'Bảng giá các dịch vụ chăm sóc da',
];

const CUSTOMER_PROMPTS = [
  'Kiểm tra lịch hẹn sắp tới của tôi',
  'Gói của tôi còn bao nhiêu buổi?',
];

export function ChatInputBar({
  onSend,
  isSending,
  isAuthenticated = false,
  showQuickPrompts = true,
}: ChatInputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompts = isAuthenticated
    ? [...CUSTOMER_PROMPTS, ...PUBLIC_PROMPTS.slice(0, 2)]
    : PUBLIC_PROMPTS;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isSending || trimmed.length > 1000) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (prompt: string) => {
    onSend(prompt);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-adjust height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-background/95 backdrop-blur-xs border-t">
      {showQuickPrompts && prompts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 hidden sm:inline-block" />
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => handlePromptClick(prompt)}
              className="text-xs shrink-0 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-primary/5 hover:border-primary/40 text-foreground transition-all disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-muted/40 rounded-xl border border-input p-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          placeholder="Hỏi trợ lý AI về dịch vụ, bảng giá, gợi ý lịch hẹn..."
          rows={1}
          maxLength={1000}
          aria-label="Nhập câu hỏi cho trợ lý AI"
          className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 text-sm shadow-none"
        />

        <div className="flex items-center gap-2 pb-1 pr-1">
          <span className="text-[11px] text-muted-foreground select-none">
            {value.length}/1000
          </span>
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isSending || value.trim().length > 1000}
            aria-label="Gửi câu hỏi"
            className="h-8 w-8 rounded-lg shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
