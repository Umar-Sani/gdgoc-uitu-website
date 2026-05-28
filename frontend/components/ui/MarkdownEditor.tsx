import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, Quote, Link, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({ value, onChange, placeholder = "Write something...", className }: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionOptions, setMentionOptions] = useState<any[]>([]);
  const [mentionCursorPos, setMentionCursorPos] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Simple toolbar actions
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newValue = text.substring(0, start) + before + selectedText + after + text.substring(end);
    onChange(newValue);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleMentionSearch = async (query: string) => {
    if (query.length < 2) {
      setMentionOptions([]);
      return;
    }
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/users/search?q=${query}`);
      const data = await res.json();
      setMentionOptions(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Mention trigger logic
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      setMentionCursorPos(cursor - mentionMatch[1].length - 1);
      handleMentionSearch(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (username: string) => {
    if (mentionCursorPos === null || !textareaRef.current) return;
    
    const val = value;
    const before = val.substring(0, mentionCursorPos);
    // find where the word ends
    const afterMatch = val.substring(mentionCursorPos).match(/^@\w*/);
    const endLength = afterMatch ? afterMatch[0].length : 0;
    const after = val.substring(mentionCursorPos + endLength);

    const newValue = before + `@${username} ` + after;
    onChange(newValue);
    setShowMentions(false);
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white shadow-sm", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-1">
          <button type="button" onClick={() => insertText('**', '**')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors" title="Bold">
            <Bold size={16} />
          </button>
          <button type="button" onClick={() => insertText('_', '_')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors" title="Italic">
            <Italic size={16} />
          </button>
          <button type="button" onClick={() => insertText('> ')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors" title="Quote">
            <Quote size={16} />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button type="button" onClick={() => insertText('[', '](url)')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors" title="Link">
            <Link size={16} />
          </button>
          <button type="button" onClick={() => insertText('![alt text](', ')')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors" title="Image">
            <ImageIcon size={16} />
          </button>
        </div>
        <div className="flex bg-gray-100 rounded-md p-0.5 border border-gray-200">
          <button 
            type="button"
            onClick={() => setIsPreview(false)}
            className={cn("px-3 py-1 text-xs font-semibold rounded-sm transition-colors", !isPreview ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800")}
          >
            Write
          </button>
          <button 
            type="button"
            onClick={() => setIsPreview(true)}
            className={cn("px-3 py-1 text-xs font-semibold rounded-sm transition-colors", isPreview ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800")}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="relative flex-1 min-h-[150px]">
        {isPreview ? (
          <div className="p-4 prose prose-slate max-w-none text-gray-800 min-h-[150px]">
            {value ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({node, ...props}) => <img {...props} className="max-w-full rounded-lg" style={{ maxHeight: '400px', objectFit: 'contain' }} />,
                  a: ({ href, children, ...props }) => {
                    if (href?.startsWith('mention:')) {
                      const username = href.replace('mention:', '');
                      return (
                        <span className="inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors">
                          @{username}
                        </span>
                      );
                    }
                    return (
                      <a href={href} className="text-blue-600 hover:underline" {...props}>
                        {children}
                      </a>
                    );
                  }
                }}
              >
                {value.replace(/\B@([a-zA-Z0-9_]+)/g, '[@$1](mention:$1)')}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            placeholder={placeholder}
            className="w-full h-full min-h-[150px] p-4 bg-transparent border-none outline-none resize-y text-gray-800 placeholder-gray-400 focus:ring-0 font-mono text-sm leading-relaxed"
          />
        )}

        {/* Mentions Dropdown */}
        {showMentions && mentionOptions.length > 0 && !isPreview && (
          <div className="absolute left-4 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
            <ul className="max-h-48 overflow-y-auto">
              {mentionOptions.map((user) => (
                <li 
                  key={user.username}
                  onClick={() => selectMention(user.username)}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-b-0"
                >
                  <span className="text-sm text-gray-900 font-semibold">@{user.username}</span>
                  <span className="text-xs text-gray-500">{user.full_name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
