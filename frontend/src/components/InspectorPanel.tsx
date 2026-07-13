import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Trash2, Code2 } from 'lucide-react';
import { toast } from 'sonner';

interface InspectorPanelProps {
  requestId: string | null;
  onProcessed: () => void;
}

export function InspectorPanel({ requestId, onProcessed }: InspectorPanelProps) {
  const [payload, setPayload] = useState<string>('');
  const [originalUri, setOriginalUri] = useState<string>('');

  useEffect(() => {
    if (requestId) {
      // Fetch the queue to find the payload
      fetch('/api/proxy/queue')
        .then(res => res.json())
        .then(queue => {
          const req = queue.find((r: any) => r.id === requestId);
          if (req) {
            let initialPayload = req.payload || '';
            try {
                // Attempt to pretty print by default
                initialPayload = JSON.stringify(JSON.parse(initialPayload), null, 2);
            } catch(e) { /* ignore and use raw */ }
            setPayload(initialPayload);
            setOriginalUri(req.uri || '');
          }
        });
    } else {
      setPayload('');
      setOriginalUri('');
    }
  }, [requestId]);

  const handleRelease = () => {
    if (!requestId) return;
    fetch(`/api/proxy/release/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    }).then(() => onProcessed());
  };

  const handleDrop = () => {
    if (!requestId) return;
    fetch(`/api/proxy/drop/${requestId}`, {
      method: 'DELETE'
    }).then(() => onProcessed());
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
    } catch (e) {
      toast.error("Invalid JSON. Cannot format.");
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    fetch('/api/proxy/settings')
      .then(res => res.json())
      .then(settings => {
        const schemaUrl = settings.schemaUrl || '/openai-schema.json';
        if (schemaUrl) {
          fetch(schemaUrl)
            .then(r => r.json())
            .then(schemaObj => {
              monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                schemas: [{
                  uri: "http://internal/schema.json",
                  fileMatch: ['*'],
                  schema: schemaObj
                }]
              });
            })
            .catch(e => console.warn("Failed to load schema from", schemaUrl, e));
        }
      })
      .catch(() => {});
  };

  if (!requestId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <Code2 className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium text-gray-400">Select a request from the queue to inspect</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Request Payload</h2>
          <p className="text-xs text-gray-500 mt-1 font-mono">{originalUri}</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleFormat}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-md transition-colors text-sm font-medium"
          >
            <Code2 className="w-4 h-4" />
            <span>Format JSON</span>
          </button>
          <button 
            onClick={handleDrop}
            className="flex items-center space-x-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-md transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Drop Request</span>
          </button>
          <button 
            onClick={handleRelease}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-lg shadow-blue-900/20 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Save & Release</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
          value={payload}
          onChange={(value) => setPayload(value || '')}
          beforeMount={handleEditorWillMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  );
}
