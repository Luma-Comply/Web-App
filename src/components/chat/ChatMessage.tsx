'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LumaLogo } from '@/components/LumaLogo';
import { cn } from '@/lib/utils';
import { Paperclip } from 'lucide-react';

interface Attachment {
  name: string;
  type?: string;
  url?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: { attachments?: Attachment[] };
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  patientName?: string;
}

function parseContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: { content: string; value?: number }[] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const flushList = () => {
    if (currentList) {
      const Tag = currentList.type;
      elements.push(
        <Tag
          key={elements.length}
          className={cn(
            'my-3 space-y-2',
            currentList.type === 'ol' ? 'list-decimal pl-6' : 'list-disc pl-6'
          )}
        >
          {currentList.items.map((item, i) => (
            <li
              key={i}
              value={item.value}
              className="text-[0.9375rem] leading-relaxed pl-1"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          ))}
        </Tag>
      );
      currentList = null;
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre
          key={elements.length}
          className="my-3 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono"
        >
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
      codeBlockContent = [];
      codeBlockLang = '';
    }
  };

  const formatInline = (text: string) => {
    let parsed = text;
    // Inline code
    parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-sage-light/40 text-dark-bg px-1.5 py-0.5 rounded text-[0.8125rem] font-mono">$1</code>');
    // Bold
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    // Italic
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Links
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-mint hover:underline" target="_blank" rel="noopener">$1</a>');
    return parsed;
  };

  lines.forEach((line, i) => {
    // Code block start/end
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Headers
    const h3Match = line.match(/^###\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h1Match = line.match(/^#\s+(.+)/);

    if (h1Match) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="text-lg font-semibold text-dark-bg mt-4 mb-2 first:mt-0">
          {h1Match[1]}
        </h3>
      );
      return;
    }

    if (h2Match) {
      flushList();
      elements.push(
        <h4 key={elements.length} className="text-base font-semibold text-dark-bg mt-4 mb-2 first:mt-0">
          {h2Match[1]}
        </h4>
      );
      return;
    }

    if (h3Match) {
      flushList();
      elements.push(
        <h5 key={elements.length} className="text-[0.9375rem] font-semibold text-dark-bg mt-3 mb-1.5 first:mt-0">
          {h3Match[1]}
        </h5>
      );
      return;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      flushList();
      elements.push(<hr key={elements.length} className="my-4 border-sage-light/30" />);
      return;
    }

    // Unordered list
    const unorderedMatch = line.match(/^[-*]\s+(.+)/);
    if (unorderedMatch) {
      if (currentList?.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({ content: formatInline(unorderedMatch[1]) });
      return;
    }

    // Ordered list
    const orderedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (orderedMatch) {
      if (currentList?.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push({ content: formatInline(orderedMatch[2]), value: parseInt(orderedMatch[1], 10) });
      return;
    }

    // Regular paragraph
    flushList();
    if (line.trim()) {
      elements.push(
        <p
          key={elements.length}
          className="text-[0.9375rem] leading-relaxed my-2 first:mt-0 last:mb-0"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    } else if (i < lines.length - 1 && lines[i + 1]?.trim()) {
      // Only add spacing between content blocks, not at the end
      elements.push(<div key={elements.length} className="h-2" />);
    }
  });

  flushList();
  flushCodeBlock();

  return elements;
}

export function ChatMessage({ message, isStreaming, patientName }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const attachments = message.metadata?.attachments;

  // Replace [PATIENT] placeholder with actual patient name for display
  const displayContent = patientName
    ? message.content.replace(/\[PATIENT\]/gi, patientName)
    : message.content;

  if (isSystem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3 w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F6F6F4] flex items-center justify-center mt-1">
          <LumaLogo className="w-5 h-5" variant={isStreaming ? 'loading' : 'default'} />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-5 py-4',
          isUser
            ? 'bg-dark-bg text-white rounded-br-md'
            : 'bg-white border border-sage-light/40 text-dark-bg rounded-bl-md shadow-sm'
        )}
      >
        <div className="break-words">
          {parseContent(displayContent)}
          {isStreaming && (
            <motion.span
              className="inline-block w-2 h-5 ml-1 bg-mint rounded-sm align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            />
          )}
        </div>
        {attachments && attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-sage-light/30 space-y-1.5">
            {attachments.map((attachment, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="truncate">{attachment.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
