/**
 * ThreadList - Chat thread list component
 * Pure presentational component for displaying chat threads
 */

import { Plus, Search } from 'lucide-react';
import { Button } from '../../base/button';
import { ButtonVariant, ButtonSize } from '../../types';
import { Skeleton } from '../../base/skeleton';

export interface ChatThread {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  isTemporary?: boolean;
}

export interface ThreadListProps {
  threads: ChatThread[];
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  className?: string;
}

export const ThreadList = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread,
  searchQuery = '',
  onSearchChange,
  loading = false,
  className = '',
}: ThreadListProps) => {
  if (loading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-full mb-3" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Chats</h2>
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Icon}
            onClick={onNewThread}
            aria-label="New chat"
          >
            <Plus size={16} />
          </Button>
        </div>

        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No chats yet. Start a new conversation!
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onThreadSelect(thread.id)}
              className={`p-3 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedThreadId === thread.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate mb-1">
                    {thread.title}
                    {thread.isTemporary && (
                      <span className="ml-2 text-xs text-muted-foreground">(Temporary)</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.preview}
                  </p>
                </div>
                {onDeleteThread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteThread(thread.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-opacity text-muted-foreground hover:text-destructive"
                    aria-label="Delete thread"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
