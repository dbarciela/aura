import { useState, useEffect, useRef } from 'react';
import { X, Terminal } from 'lucide-react';

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverHealthy?: boolean;
  targetUrl?: string;
}

export function LogViewerModal({ isOpen, onClose, serverHealthy, targetUrl }: LogViewerModalProps) {
  const [logs, setLogs] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const fetchLogs = async () => {
      if (!isOpen) return;
      try {
        const response = await fetch('/api/proxy/target-logs');
        if (response.ok) {
          const text = await response.text();
          setLogs(text);
        }
      } catch (error) {
        console.error('Failed to fetch target logs', error);
      }
    };

    if (isOpen) {
      fetchLogs();
      intervalId = setInterval(fetchLogs, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-4 text-gray-200">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5" />
              <h2 className="font-semibold">Target Server Console Logs</h2>
            </div>
            
            {serverHealthy && targetUrl && (
              <a 
                href={targetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 hover:text-purple-300 border border-purple-500/30 rounded-full transition-colors flex items-center shadow-sm"
              >
                <span className="mr-1">🔗</span> Open Web UI
              </a>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-y-auto bg-black font-mono text-xs text-green-400 whitespace-pre-wrap break-words"
        >
          {logs || "Waiting for logs..."}
          <div ref={logEndRef} />
        </div>
        
        <div className="p-3 border-t border-gray-800 bg-gray-900 flex justify-between items-center text-xs text-gray-500">
          <div>Polling every 2 seconds</div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>
    </div>
  );
}
