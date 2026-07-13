import { useState, useEffect } from 'react';
import { sseService } from '../services/sseService';

export function NetworkIndicator() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const ping = () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), 500);
    };

    const unsubscribe = sseService.subscribe((payload: any) => {
      if (payload.type === 'REQUEST' || payload.type === 'CHUNK' || payload.type === 'DONE') {
        ping();
      }
    });

    return () => {
      unsubscribe();
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
