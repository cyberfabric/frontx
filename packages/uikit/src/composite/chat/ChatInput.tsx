/**
 * ChatInput - Message input component
 * Pure presentational component for chat message input
 */

import { trim } from 'lodash';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '../../base/button';
import { ButtonVariant, ButtonSize } from '../../types';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachFile?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
  className?: string;
}

export const ChatInput = ({
  value,
  onChange,
  onSend,
  onAttachFile,
  placeholder = 'Type a message...',
  disabled = false,
  maxRows = 14,
  className = '',
}: ChatInputProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && trim(value)) {
        onSend();
      }
    }
  };

  const rows = Math.min(
    Math.max(value.split('\n').length, 1),
    maxRows
  );

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* Attach file button */}
      {onAttachFile && (
        <Button
          variant={ButtonVariant.Ghost}
          size={ButtonSize.Icon}
          onClick={onAttachFile}
          disabled={disabled}
          className="flex-shrink-0"
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </Button>
      )}

      {/* Text input */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* Send button */}
      <Button
        onClick={onSend}
        disabled={disabled || !trim(value)}
        className="flex-shrink-0"
        aria-label="Send message"
      >
        <Send size={20} />
      </Button>
    </div>
  );
};
