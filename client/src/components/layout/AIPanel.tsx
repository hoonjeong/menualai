import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Trash2, AlertCircle } from 'lucide-react';
import { marked } from 'marked';
import { useUIStore } from '../../stores';
import {
  sendChatMessage,
  clearChatHistory,
  isApiKeyConfigured,
} from '../../api/gemini';
import clsx from 'clsx';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// marked 설정
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function AIPanel() {
  const { aiPanelOpen, setAIPanelOpen } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: '안녕하세요! 경영, 운영, 서비스 매뉴얼 제작 및 비즈니스 표준화 전문가입니다.\n\n다음 분야에서 도움을 드릴 수 있습니다:\n- **운영 표준화**: 업무 프로세스 설계, SOP 작성, 개폐점 체크리스트\n- **서비스 품질**: 고객 응대(CS) 가이드, 상황별 스크립트, 컴플레인 해결\n- **조직 및 인사**: 직원 채용/교육 매뉴얼, 직무 기술서\n- **사업장 관리**: 시설 관리, 안전/보안 매뉴얼, 리스크 관리\n\n무엇을 도와드릴까요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // API 키 설정 여부
  const apiConfigured = isApiKeyConfigured();

  // 메시지 목록 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 패널 열릴 때 입력창 포커스
  useEffect(() => {
    if (aiPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aiPanelOpen]);

  // 메시지 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage.content);

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.success ? response.message : (response.error || '오류가 발생했습니다.'),
        timestamp: new Date(),
        isError: !response.success,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 대화 기록 삭제
  const handleClearChat = () => {
    clearChatHistory();
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: '대화 기록이 삭제되었습니다. 새로운 질문을 해주세요!',
        timestamp: new Date(),
      },
    ]);
  };

  // 마크다운 렌더링
  const renderMarkdown = (content: string) => {
    return { __html: marked(content) as string };
  };

  // 키보드 단축키
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter로 전송 (Shift+Enter는 제외)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!aiPanelOpen) return null;

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col z-20 shadow-xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <span className="font-semibold text-sm">AI 어시스턴트</span>
            <span className="ml-2 text-xs text-gray-500">Gemini</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 대화 삭제 버튼 */}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="대화 기록 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {/* 닫기 버튼 */}
          <button
            onClick={() => setAIPanelOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* API 키 미설정 경고 */}
      {!apiConfigured && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>API 키가 설정되지 않았습니다.</span>
          </div>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex gap-3',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            {/* 아바타 */}
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'assistant'
                  ? message.isError
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              )}
            >
              {message.role === 'assistant' ? (
                message.isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            {/* 메시지 내용 */}
            <div
              className={clsx(
                'max-w-[85%] px-3 py-2 rounded-lg text-sm',
                message.role === 'assistant'
                  ? message.isError
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  : 'bg-primary-600 text-white'
              )}
            >
              {message.role === 'assistant' ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5"
                  dangerouslySetInnerHTML={renderMarkdown(message.content)}
                />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
                <span className="text-xs text-gray-500">응답 생성 중...</span>
              </div>
            </div>
          </div>
        )}

        {/* 스크롤 앵커 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={apiConfigured ? "메시지를 입력하세요..." : "API 키를 설정해 주세요"}
            className="input flex-1 text-sm"
            disabled={isLoading || !apiConfigured}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !apiConfigured}
            className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-center">
          경영, 운영, 서비스 매뉴얼 관련 질문에 답변합니다
        </p>
      </form>
    </aside>
  );
}
