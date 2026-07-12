import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, MonitorDot } from 'lucide-react';

interface GpuStat {
  name: string;
  temp: number;
  utilization: number;
  vramUsedGb: string;
  vramTotalGb: string;
  vramPercent: number;
}

interface HardwareStats {
  cpuLoad: number;
  cpuTemp?: number;
  ramUsedGb: string;
  ramTotalGb: string;
  ramPercent: number;
  gpus?: GpuStat[];
  // Legacy
  gpuName?: string;
  gpuTemp?: number;
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
    <div className="flex items-center space-x-4 text-xs text-gray-400 font-mono">
      {/* CPU */}
      <div className="flex items-center space-x-2" title="CPU Load">
        <Cpu className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-bold text-gray-300">CPU</span>
        <span className="text-blue-400">{stats.cpuLoad}%</span>
        {stats.cpuTemp !== undefined && <span className="text-gray-500">({stats.cpuTemp}°C)</span>}
      </div>

      <div className="w-px h-3 bg-gray-700"></div>

      {/* RAM */}
      <div className="flex items-center space-x-2" title={`RAM: ${stats.ramUsedGb}GB / ${stats.ramTotalGb}GB`}>
        <MemoryStick className="w-3.5 h-3.5 text-green-400" />
        <span className="font-bold text-gray-300">RAM</span>
        <span className="text-green-400">{stats.ramPercent}%</span>
      </div>

      {stats.gpus && stats.gpus.length > 0 ? (
        stats.gpus.map((gpu, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <div className="w-px h-3 bg-gray-700"></div>
            <MonitorDot className="w-3.5 h-3.5 text-pink-400" />
            <span className="font-bold text-gray-300 truncate max-w-[80px]" title={gpu.name}>{gpu.name}</span>
            <span className="text-pink-400" title="GPU Load">{gpu.utilization}%</span>
            <span className={`flex items-center ${gpu.vramPercent > 85 ? 'text-red-400' : 'text-purple-400'}`} title="VRAM Usage">
              <span className="ml-1 text-[10px] text-gray-500 uppercase mr-1">VRAM</span>
              {gpu.vramPercent}%
            </span>
            <span className="text-gray-500">({gpu.temp}°C)</span>
          </div>
        ))
      ) : stats.vramPercent !== undefined && (
        <>
          <div className="w-px h-3 bg-gray-700"></div>
          {/* Legacy GPU / VRAM */}
          <div className="flex items-center space-x-2">
            <MonitorDot className="w-3.5 h-3.5 text-pink-400" />
            <span className="font-bold text-gray-300 truncate max-w-[80px]" title={stats.gpuName || 'GPU'}>{stats.gpuName || 'GPU'}</span>
            {stats.gpuTemp !== undefined && <span className="text-gray-500">({stats.gpuTemp}°C)</span>}
            <span className={`flex items-center ${stats.vramPercent > 85 ? 'text-red-400' : 'text-purple-400'}`} title="VRAM Usage">
              <span className="ml-1 text-[10px] text-gray-500 uppercase mr-1">VRAM</span>
              {stats.vramPercent}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
