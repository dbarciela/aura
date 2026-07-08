import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeAgentXml from '../utils/rehypeAgentXml';
import { sanitizeXmlTags } from '../utils/sanitizeXmlTags';

interface ChatMessageBubbleProps {
  msg: {
    role: string;
    content: string;
    tool_calls?: any[];
  };
  collapseXmlMode: boolean;
}

const getRoleConfig = (role: string) => {
  const r = role.toLowerCase();
  if (r === 'user') return { align: 'right', iconBg: 'bg-blue-600/30', iconText: 'text-blue-400', bubbleBg: 'bg-blue-600/20', bubbleText: 'text-blue-100' };
  if (r === 'assistant') return { align: 'left', iconBg: 'bg-purple-600/30', iconText: 'text-purple-400', bubbleBg: 'bg-gray-800', bubbleText: 'text-gray-200' };
  if (r === 'system') return { align: 'left', iconBg: 'bg-gray-600/30', iconText: 'text-gray-400', bubbleBg: 'bg-gray-900 border border-gray-800', bubbleText: 'text-gray-400' };
  if (r === 'tool') return { align: 'left', iconBg: 'bg-orange-600/30', iconText: 'text-orange-400', bubbleBg: 'bg-orange-900/20 border border-orange-800/30', bubbleText: 'text-orange-100' };
  
  // Default/Unknown
  return { align: 'left', iconBg: 'bg-teal-600/30', iconText: 'text-teal-400', bubbleBg: 'bg-teal-900/20 border border-teal-800/30', bubbleText: 'text-teal-100' };
};

export function ChatMessageBubble({ msg, collapseXmlMode }: ChatMessageBubbleProps) {
  const config = getRoleConfig(msg.role);
  const isRight = config.align === 'right';
  const initial = msg.role ? msg.role.charAt(0).toUpperCase() : '?';
  
  return (
    <div className={`flex space-x-4 ${isRight ? 'justify-end' : 'justify-start'}`}>
      {!isRight && (
        <div 
            className={`w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center ${config.iconText} mt-1 flex-shrink-0 font-bold text-sm cursor-help`}
            title={`Role: ${msg.role}`}
        >
          {initial}
        </div>
      )}
      <div className={`p-4 rounded-xl max-w-[95%] overflow-x-auto ${config.bubbleBg} ${config.bubbleText}`}>
        {msg.content && (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown 
                  remarkPlugins={[remarkBreaks]}
                  rehypePlugins={[rehypeRaw as any, [rehypeAgentXml, { collapseAllButUserRequest: collapseXmlMode }]]}
              >
                {sanitizeXmlTags(msg.content)}
              </ReactMarkdown>
            </div>
        )}
        
        {msg.tool_calls && msg.tool_calls.length > 0 && (
            <div className="mt-3 space-y-2">
                {msg.tool_calls.map((tc: any, idx: number) => (
                    <details key={idx} className="bg-gray-950/40 border border-gray-700/50 rounded-lg p-2 text-xs">
                        <summary className="cursor-pointer font-mono text-purple-400 hover:text-purple-300 font-semibold select-none flex items-center outline-none">
                            <span className="mr-2">🔧</span>
                            {tc.function?.name || 'unknown_tool'}()
                        </summary>
                        <div className="mt-2 pl-6 text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                            {tc.function?.arguments || 'no arguments'}
                        </div>
                    </details>
                ))}
            </div>
        )}
      </div>
      {isRight && (
        <div 
            className={`w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center ${config.iconText} mt-1 flex-shrink-0 font-bold text-sm cursor-help`}
            title={`Role: ${msg.role}`}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
