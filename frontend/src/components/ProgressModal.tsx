import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl: string;
  title?: string;
}

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}

export function ProgressModal({ isOpen, onClose, streamUrl, title = "Progress" }: ProgressModalProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !streamUrl) return;

    setSteps([]);
    setIsDone(false);
    setErrorMsg(null);

    const es = new EventSource(streamUrl);

    es.addEventListener('progress', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.step === 'ERROR') {
          setErrorMsg(payload.message);
          setIsDone(true);
          es.close();
          return;
        }

        if (payload.step === 'DONE') {
          setIsDone(true);
          es.close();
          // Also mark previous running as done just in case
          setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'done' } : s));
          return;
        }

        setSteps(prev => {
          const existingIdx = prev.findIndex(s => s.id === payload.step);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx], status: payload.status, message: payload.message || next[existingIdx].message };
            return next;
          } else {
            return [...prev, { id: payload.step, label: payload.step.replace(/_/g, ' '), status: payload.status, message: payload.message }];
          }
        });

      } catch (err) {
        console.error('Failed to parse progress chunk', err);
      }
    });

    es.addEventListener('error', () => {
      if (!isDone) {
        setErrorMsg("Connection lost to the server.");
        setIsDone(true);
      }
      es.close();
    });

    return () => {
      es.close();
    };
  }, [isOpen, streamUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="font-semibold text-gray-200">{title}</h2>
          {isDone && (
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="p-6 flex flex-col space-y-4 max-h-[60vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg flex items-start space-x-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="mt-0.5 shrink-0">
                  {step.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {step.status === 'running' && <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />}
                  {step.status === 'pending' && <Circle className="w-5 h-5 text-gray-700" />}
                  {step.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium capitalize ${step.status === 'done' ? 'text-gray-400' : step.status === 'running' ? 'text-gray-200' : 'text-gray-500'}`}>
                    {step.label.toLowerCase()}
                  </span>
                  {step.message && (
                    <span className="text-xs text-gray-500 mt-1">{step.message}</span>
                  )}
                </div>
              </div>
            ))}
            
            {steps.length === 0 && !errorMsg && !isDone && (
              <div className="flex items-center space-x-3 text-gray-500 text-sm py-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Initializing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            disabled={!isDone}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDone 
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isDone ? 'Close' : 'Please wait...'}
          </button>
        </div>
      </div>
    </div>
  );
}
