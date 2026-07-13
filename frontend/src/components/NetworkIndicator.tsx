import { useState, useEffect } from 'react';

export function NetworkIndicator() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/proxy/live');
    
    let timeout: ReturnType<typeof setTimeout>;

    const ping = () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), 500);
    };

    es.addEventListener('live-chat', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'REQUEST' || payload.type === 'CHUNK' || payload.type === 'DONE') {
          ping();
        }
      } catch { /* ignore */ }
    });

    return () => {
      es.close();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2 mr-4" title="Network Traffic Indicator">
      <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-gray-600'}`}></div>
      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{isActive ? 'Receiving' : 'Idle'}</span>
    </div>
  );
}
