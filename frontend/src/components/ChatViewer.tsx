import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatViewerProps {
  messages: ChatMessage[];
  collapseXmlMode: boolean;
}

export function ChatViewer({ messages, collapseXmlMode }: ChatViewerProps) {
  const [hiddenRoles, setHiddenRoles] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    messages.forEach(m => roles.add(m.role || 'unknown'));
    return Array.from(roles);
  }, [messages]);

  const toggleRole = (role: string) => {
    setHiddenRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const visibleMessages = messages.filter(m => !hiddenRoles.has(m.role || 'unknown'));

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>No chat data available.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Floating Filter Menu */}
      <div className="sticky top-4 z-20 flex justify-end px-4 mb-4">
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs shadow-lg transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Roles</span>
          </button>
          
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-30">
              <div className="p-2 border-b border-gray-700 bg-gray-900/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Visible Roles
              </div>
              <div className="p-2 flex flex-col space-y-2">
                {availableRoles.map(role => (
                  <label key={role} className="flex items-center space-x-3 cursor-pointer text-sm text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-gray-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={!hiddenRoles.has(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-800"
                    />
                    <span className="capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-6xl w-full mx-auto space-y-6 pb-20 px-4">
        {visibleMessages.map((msg, i) => (
          <ChatMessageBubble key={`${msg.role}-${i}`} msg={msg as any} collapseXmlMode={collapseXmlMode} />
        ))}
      </div>
    </div>
  );
}
