import { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { useEditorStore } from '../../../stores';
import { BaseBlock } from './BaseBlock';
import type { Block } from '../../../types';
import clsx from 'clsx';

interface TextBlockProps {
  block: Block;
}

// marked 설정
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function TextBlock({ block }: TextBlockProps) {
  const { updateBlock, selectedBlockId } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSelected = selectedBlockId === block.id;

  // 선택 해제시 편집 모드 종료
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // 편집 모드 진입시 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // 커서를 끝으로 이동
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // textarea 높이 자동 조절
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  // 내용 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateBlock(block.id, { content: newContent });
  };

  // 키보드 단축키
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Enter 키 처리 - 자동 목록 계속
    if (e.key === 'Enter' && !e.shiftKey) {
      const { selectionStart, value } = textarea;
      const currentLine = value.substring(0, selectionStart).split('\n').pop() || '';

      // 번호 목록 패턴 (1. 2. 3. ...)
      const numberedMatch = currentLine.match(/^(\d+)\.\s/);
      if (numberedMatch) {
        const nextNumber = parseInt(numberedMatch[1]) + 1;
        // 현재 줄이 번호만 있고 내용이 없으면 목록 종료
        if (currentLine.trim() === `${numberedMatch[1]}.`) {
          e.preventDefault();
          const newContent = value.substring(0, selectionStart - currentLine.length) +
            '\n' + value.substring(selectionStart);
          setContent(newContent);
          updateBlock(block.id, { content: newContent });
          return;
        }
        e.preventDefault();
        const insertText = `\n${nextNumber}. `;
        const newContent = value.substring(0, selectionStart) + insertText + value.substring(selectionStart);
        setContent(newContent);
        updateBlock(block.id, { content: newContent });
        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + insertText.length, selectionStart + insertText.length);
        }, 0);
        return;
      }

      // 글머리 기호 목록 패턴 (- 또는 *)
      const bulletMatch = currentLine.match(/^([-*])\s/);
      if (bulletMatch) {
        // 현재 줄이 기호만 있고 내용이 없으면 목록 종료
        if (currentLine.trim() === bulletMatch[1]) {
          e.preventDefault();
          const newContent = value.substring(0, selectionStart - currentLine.length) +
            '\n' + value.substring(selectionStart);
          setContent(newContent);
          updateBlock(block.id, { content: newContent });
          return;
        }
        e.preventDefault();
        const insertText = `\n${bulletMatch[1]} `;
        const newContent = value.substring(0, selectionStart) + insertText + value.substring(selectionStart);
        setContent(newContent);
        updateBlock(block.id, { content: newContent });
        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + insertText.length, selectionStart + insertText.length);
        }, 0);
        return;
      }
    }

    // Backspace - 빈 블록 삭제
    if (e.key === 'Backspace' && !content) {
      e.preventDefault();
      // 첫 번째 블록이 아니면 삭제
      // (실제로는 이전 블록으로 포커스 이동 로직 추가 필요)
    }

    // Tab - 들여쓰기
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = textarea;
      const insertText = '  '; // 2칸 스페이스
      const newContent = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
      setContent(newContent);
      updateBlock(block.id, { content: newContent });
      setTimeout(() => {
        textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
      }, 0);
    }
  };

  // 마크다운 렌더링
  const renderMarkdown = () => {
    if (!content) {
      return '<p class="text-gray-400">내용을 입력하세요...</p>';
    }
    return marked(content);
  };

  return (
    <BaseBlock block={block} className="block-text">
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setIsEditing(false)}
          placeholder="내용을 입력하세요..."
          className={clsx(
            'w-full min-h-[100px] p-0 bg-transparent border-none resize-none',
            'text-gray-900 dark:text-gray-100',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-0',
            'font-mono text-sm leading-relaxed'
          )}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className={clsx(
            'prose prose-sm dark:prose-invert max-w-none cursor-text min-h-[40px]',
            'prose-headings:mt-4 prose-headings:mb-2',
            'prose-p:my-2 prose-p:leading-relaxed',
            'prose-ul:my-2 prose-ol:my-2',
            'prose-li:my-1',
            'prose-code:bg-gray-100 prose-code:dark:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
            '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6'
          )}
          dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
        />
      )}
    </BaseBlock>
  );
}
