import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSendChatMessage } from '@/hooks/useChat';
import { sanitiseText } from '@/utils/sanitise';
import { cn } from '@/utils/cn';
import type { ChatbotDrawerProps } from '@/types/components';

type ChatMessage = {
  id: number;
  role: 'user' | 'bot';
  text: string;
  source?: 'faq' | 'ai';
};

const SUGGESTION_KEYS = [
  'whatIsApp',
  'isItFree',
  'barcodeScanning',
  'aiTips',
  'dataSafety',
] as const;

export function ChatbotDrawer({ isOpen, onClose, language }: ChatbotDrawerProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const { mutate, isPending, error } = useSendChatMessage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);

  const nextIdRef = useRef(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const greeting = useMemo<ChatMessage>(
    () => ({ id: -1, role: 'bot', text: t('chatbot.greeting') }),
    [t],
  );

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setMessages([]);
    setInput('');
    setIsRateLimited(false);
    nextIdRef.current = 0;
    inputRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isPending, isOpen]);

  if (!isOpen) return null;

  const appendMessage = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: nextIdRef.current++ }]);
  };

  const sendMessage = (rawText: string) => {
    const clean = sanitiseText(rawText);
    if (clean.length === 0 || isRateLimited) return;

    appendMessage({ role: 'user', text: clean });

    mutate(
      { message: clean, language },
      {
        onSuccess: (response) => {
          appendMessage({
            role: 'bot',
            text: response.answer,
            source: response.source,
          });
        },
        onError: (err) => {
          if (err.message === 'rate_limit_exceeded') {
            appendMessage({ role: 'bot', text: t('chatbot.rateLimit') });
            setIsRateLimited(true);
          } else {
            appendMessage({ role: 'bot', text: t('chatbot.error') });
          }
        },
      },
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim().length === 0) return;
    sendMessage(input);
    setInput('');
  };

  const handleChipClick = (suggestionKey: (typeof SUGGESTION_KEYS)[number]) => {
    sendMessage(t(`chatbot.suggestions.${suggestionKey}`));
  };

  const showSuggestions = messages.length === 0 && !isPending;
  const inputDisabled = isPending || isRateLimited;
  const sendDisabled = inputDisabled || input.trim().length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 md:items-stretch">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={t('chatbot.title')}
        className={cn(
          'flex max-h-[85vh] w-full flex-col rounded-t-card bg-white shadow-xl dark:bg-warm-900',
          'md:max-h-none md:max-w-md md:rounded-none md:rounded-l-card',
        )}
      >
        <div className="flex items-center justify-between border-b border-warm-200 px-4 py-3 dark:border-warm-700">
          <h2
            id={titleId}
            className="font-display text-base font-semibold text-warm-900 dark:text-warm-100"
          >
            {t('chatbot.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('chatbot.close')}
            className={cn(
              'rounded-full p-1.5 text-warm-400 transition-colors hover:bg-warm-100 hover:text-warm-700',
              'dark:hover:bg-warm-800 dark:hover:text-warm-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <MessageBubble message={greeting} />

          {showSuggestions && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-warm-600 dark:text-warm-400">
                {t('chatbot.suggestionsLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChipClick(key)}
                    disabled={inputDisabled}
                    className={cn(
                      'rounded-pill border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 transition-colors',
                      'hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60',
                      'dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200 dark:hover:bg-brand-900',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                    )}
                  >
                    {t(`chatbot.suggestions.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              sourceLabel={t(`chatbot.source.${msg.source ?? 'ai'}`)}
            />
          ))}

          {isPending && <TypingIndicator label={t('chatbot.typing')} />}

          {!isPending && !isRateLimited && error !== null && messages.length === 0 && (
            <p role="alert" className="text-sm text-red-500">
              {t('chatbot.error')}
            </p>
          )}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-warm-200 px-4 py-3 dark:border-warm-700"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={inputDisabled}
            placeholder={t('chatbot.placeholder')}
            aria-label={t('chatbot.placeholder')}
            maxLength={500}
            className={cn(
              'flex-1 rounded-input border border-warm-300 bg-white px-3 py-2 text-sm outline-none transition-colors',
              'placeholder:text-warm-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              'dark:border-warm-600 dark:bg-warm-800 dark:text-warm-100',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          />
          <button
            type="submit"
            disabled={sendDisabled}
            aria-label={t('chatbot.send')}
            className={cn(
              'rounded-pill bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
          >
            {isPending ? t('chatbot.sending') : t('chatbot.send')}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, sourceLabel }: { message: ChatMessage; sourceLabel?: string }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-card px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-brand-700 text-white'
            : 'bg-warm-100 text-warm-800 dark:bg-warm-800 dark:text-warm-100',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {!isUser && message.source !== undefined && sourceLabel !== undefined && (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-warm-500 dark:text-warm-400">
            {sourceLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className="inline-flex items-center gap-1 rounded-card bg-warm-100 px-3 py-2 dark:bg-warm-800">
        <span className="sr-only">{label}</span>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400" />
      </div>
    </div>
  );
}
