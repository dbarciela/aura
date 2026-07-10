import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, MonitorDot } from 'lucide-react';

interface HardwareStats {
  cpuLoad: number;
  ramUsedGb: string;
  ramTotalGb: string;
  ramPercent: number;
  vramUsedGb?: string;
  vramTotalGb?: string;
  vramPercent?: number;
}

export function HardwareWidget() {
  const [stats, setStats] = useState<HardwareStats | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/proxy/live');
    
    es.addEventListener('live-chat', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'HARDWARE') {
          setStats(payload.data);
        }
      } catch { /* ignore */ }
    });

    return () => es.close();
  }, []);

  if (!stats) return null;

  return (
    <div className="flex items-center space-x-4 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-300">
      <div className="flex items-center space-x-1.5" title="CPU Load">
        <Cpu className="w-3.5 h-3.5 text-blue-400" />
        <span className="w-8">{stats.cpuLoad}%</span>
      </div>
      <div className="w-px h-4 bg-gray-700"></div>
      <div className="flex items-center space-x-1.5" title={`RAM: ${stats.ramUsedGb}GB / ${stats.ramTotalGb}GB`}>
        <MemoryStick className="w-3.5 h-3.5 text-green-400" />
        <span className="w-8">{stats.ramPercent}%</span>
      </div>
      {stats.vramPercent !== undefined && (
        <>
          <div className="w-px h-4 bg-gray-700"></div>
          <div className="flex items-center space-x-1.5" title={`VRAM: ${stats.vramUsedGb}GB / ${stats.vramTotalGb}GB`}>
            <MonitorDot className={`w-3.5 h-3.5 ${stats.vramPercent > 85 ? 'text-red-400' : 'text-purple-400'}`} />
            <span className="w-8">{stats.vramPercent}%</span>
          </div>
        </>
      )}
    </div>
  );
}
