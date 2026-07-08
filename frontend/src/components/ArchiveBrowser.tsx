import { useState, useEffect } from 'react';
import { Search, Database, Clock, Sparkles, ChevronDown, Download } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { ChatViewer } from './ChatViewer';
import { downloadStringAsFile } from '../utils/downloadUtils';

import { parseMarkdownChat } from '../utils/chatParser';

export function ArchiveBrowser() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'markdown'>('raw');
  const [collapseXmlMode, setCollapseXmlMode] = useState(true);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number, y: number, type: 'session' | 'group', 
    sessionId?: string, groupId?: string, sessionIds?: string[], sessions?: any[]
  } | null>(null);

  useEffect(() => {
      const closeMenu = () => setContextMenu(null);
      window.addEventListener('click', closeMenu);
      return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = async (searchQuery?: string) => {
    try {
      const url = searchQuery
        ? `/api/proxy/archive?query=${encodeURIComponent(searchQuery)}`
        : '/api/proxy/archive';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        if (data.length > 0 && !selectedSession) {
          setSelectedSession(data[0]);
        }
      }
    } catch { /* ignore */ }
  };
  
  const handlePurgeAll = async () => {
      if (!window.confirm('Are you sure you want to delete ALL logs? This cannot be undone.')) return;
      try {
          await fetch('/api/proxy/archive/all', { method: 'DELETE' });
          setResults([]);
          setSelectedSession(null);
      } catch { /* ignore */ }
  };

  const handleDeleteSession = async (id: string) => {
      try {
          await fetch(`/api/proxy/archive/${id}`, { method: 'DELETE' });
          setResults(prev => prev.filter(s => s.id !== id));
          if (selectedSession?.id === id) setSelectedSession(null);
      } catch { /* ignore */ }
  };

  const handleDeleteGroup = async (ids: string[]) => {
      if (!window.confirm(`Delete ${ids.length} sessions in this group?`)) return;
      try {
          await fetch(`/api/proxy/archive/bulk`, { 
              method: 'DELETE', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ids)
          });
          setResults(prev => prev.filter(s => !ids.includes(s.id)));
          if (selectedSession && ids.includes(selectedSession.id)) setSelectedSession(null);
      } catch { /* ignore */ }
  };

  const handleCleanupGroup = async (ids: string[]) => {
      try {
          const res = await fetch(`/api/proxy/archive/cleanup`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ids)
          });
          if (res.ok) {
              const data = await res.json();
              if (data.deleted && data.deleted.length > 0) {
                  alert(`Cleaned up ${data.deleted.length} redundant sessions.`);
                  setResults(prev => prev.filter(s => !data.deleted.includes(s.id)));
                  if (selectedSession && data.deleted.includes(selectedSession.id)) setSelectedSession(null);
              } else {
                  alert('No redundant sessions found.');
              }
          }
      } catch { /* ignore */ }
  };

  const handleExportGroup = (sessions: any[], title: string) => {
      const sorted = [...sessions].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const lastSession = sorted[sorted.length - 1];
      const parsed = parseMarkdownChat(lastSession.full_payload);
      const data = parsed.map((m: any) => `### ${m.role === 'user' ? 'User' : 'Assistant'}\n\n${m.content}`).join('\n\n---\n\n');
      downloadStringAsFile(data, `group-${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`);
  };

  const handleContextMenu = (e: any, type: 'session' | 'group', sessionId?: string, groupId?: string, sessionIds?: string[], sessions?: any[]) => {
      e.preventDefault();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          type, sessionId, groupId, sessionIds, sessions
      });
  };

  const handleGenerateTitle = async (sessions: any[]) => {
    if (!sessions || sessions.length === 0) return;
    setIsGeneratingTitle(true);
    try {
      const ids = sessions.map(s => s.id);
      const response = await fetch('/api/proxy/archive/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      });
      if (response.ok) {
        const data = await response.json();
        const newTitle = data.improved_title;
        setResults(prev => prev.map(s => ids.includes(s.id) ? { ...s, improved_title: newTitle } : s));
        if (selectedSession && ids.includes(selectedSession.id)) {
            setSelectedSession({ ...selectedSession, improved_title: newTitle });
        }
      }
    } catch { /* ignore */ } finally {
      setIsGeneratingTitle(false);
    }
  };

  const toggleGroup = (index: number) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  const handleDownload = () => {
    if (!selectedSession) return;
    const filename = `session-${selectedSession.id}.${viewMode === 'raw' ? 'json' : 'md'}`;
    let data = selectedSession.full_payload;
    if (viewMode === 'markdown') {
        const parsed = parseMarkdownChat(data);
        data = parsed.map((m: any) => `### ${m.role === 'user' ? 'User' : 'Assistant'}\n\n${m.content}`).join('\n\n---\n\n');
    }
    downloadStringAsFile(data, filename);
  };

  const formatRawPayload = (payload: string) => {
      try {
          const reqStr = payload.split("RESPONSE:\n")[0].replace("REQUEST:\n", "").trim();
          const respStr = payload.split("RESPONSE:\n")[1]?.trim();
          
          let reqObj = null;
          try { reqObj = JSON.parse(reqStr); } catch { reqObj = reqStr; }
          
          let respObj = null;
          try { if (respStr) respObj = JSON.parse(respStr); } catch { respObj = respStr; }
          
          return JSON.stringify({ REQUEST: reqObj, RESPONSE: respObj }, null, 2);
      } catch {
          return payload;
      }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar: Search & Results List */}
      <div className="w-96 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search payloads (FTS5)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchResults(query)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <button
              onClick={handlePurgeAll}
              title="Purge All Logs"
              className="px-3 py-2 bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-800/50 rounded-lg text-xs font-semibold transition-colors"
            >
              Purge All
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <Database className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No sessions found</p>
            </div>
          ) : (
            (() => {
              const groups: any[] = [];
              const ungrouped: any[] = [];

              const formatTitle = (key: string) => {
                  if (!key) return "Empty/XML Prompt";
                  
                  // Try to find the <USER_REQUEST> or <user_input> tag
                  let match = key.match(/<user(?:Request|_input|Input)>([\s\S]*?)<\/user(?:Request|_input|Input)>/i);
                  let text = "";
                  
                  if (match) {
                      text = match[1];
                  } else {
                      // Remove heavy context tags manually if no specific user request block
                      text = key.replace(/<(environment_info|workspace_info|user_information|identity|plugins|messaging|conversation_transcript|artifacts|slash_commands|subagents)>[\s\S]*?<\/\1>/gi, ' ');
                  }
                  
                  text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                  if (text.length === 0) return "Empty/XML Prompt";
                  
                  // Truncate fallback titles to a reasonable length so the tooltip doesn't explode
                  if (text.length > 150) {
                      return text.substring(0, 150) + "...";
                  }
                  return text;
              };

              const getSharedPrefixLength = (msgsA: any[], msgsB: any[]) => {
                  let i = 0;
                  while (i < msgsA.length && i < msgsB.length) {
                      if (msgsA[i].role !== msgsB[i].role || msgsA[i].content !== msgsB[i].content) {
                          break;
                      }
                      i++;
                  }
                  return i;
              };
              
              // Parse timestamp correctly by handling SQLite UTC strings without 'Z' and 'T'
              const getTime = (d: string) => {
                  if (!d) return 0;
                  return new Date(d.replace(' ', 'T') + (d.endsWith('Z') ? '' : 'Z')).getTime();
              };

              // Sort results oldest first to simulate real-time chronological grouping
              const sortedResults = [...results].sort((a,b) => getTime(a.created_at) - getTime(b.created_at));

              sortedResults.forEach(session => {
                 let parsedMsgs = null;
                 try {
                     const reqStr = session.full_payload.split("RESPONSE:\n")[0].replace("REQUEST:\n", "").trim();
                     const reqJson = JSON.parse(reqStr);
                     if (reqJson.messages && reqJson.messages.length > 0) {
                         parsedMsgs = reqJson.messages;
                     }
                 } catch { /* ignore */ }
                 
                 session._msgs = parsedMsgs;
                 
                 if (!parsedMsgs || parsedMsgs.length === 0) {
                     ungrouped.push(session);
                     return;
                 }
                 
                 let bestGroup = null;
                 let bestMatchLen = 0;
                 
                 for (const group of groups) {
                     let maxPrefixInGroup = 0;
                     for (const existingSession of group.sessions) {
                          if (!existingSession._msgs) continue;
                          const matchLen = getSharedPrefixLength(parsedMsgs, existingSession._msgs);
                          if (matchLen > maxPrefixInGroup) maxPrefixInGroup = matchLen;
                     }
                     
                     if (maxPrefixInGroup > bestMatchLen) {
                         bestMatchLen = maxPrefixInGroup;
                         bestGroup = group;
                     }
                 }
                 
                 const timeSinceLastInBestGroup = bestGroup ? (getTime(session.created_at) - getTime(bestGroup.sessions[bestGroup.sessions.length - 1].created_at)) : Infinity;
                 const hoursSinceLast = timeSinceLastInBestGroup / (1000 * 60 * 60);

                 // To join a group, it must share at least 1 message AND (be a deep match OR recent < 4h)
                 const isDeepMatch = bestMatchLen >= 2;
                 const isRecentMatch = bestMatchLen >= 1 && hoursSinceLast < 4;
                 
                 if (bestGroup && (isDeepMatch || isRecentMatch)) {
                     bestGroup.sessions.push(session);
                     // If any session in the group has an improved title, use it for the whole group
                     if (session.improved_title && (!bestGroup.sessions[0].improved_title)) {
                         bestGroup.title = session.improved_title;
                     }
                 } else {
                     const firstUserMsg = parsedMsgs.find((m: any) => m.role === 'user');
                     const content = firstUserMsg ? firstUserMsg.content : parsedMsgs[0].content;
                     groups.push({
                         title: session.improved_title || formatTitle(typeof content === 'string' ? content : JSON.stringify(content)),
                         sessions: [session]
                     });
                 }
              });

              groups.sort((a, b) => {
                  const timeA = getTime(a.sessions[a.sessions.length - 1].created_at);
                  const timeB = getTime(b.sessions[b.sessions.length - 1].created_at);
                  return timeB - timeA;
              });
              groups.forEach(g => {
                  g.lastTime = new Date(g.sessions[g.sessions.length - 1].created_at.replace(' ', 'T') + (g.sessions[g.sessions.length - 1].created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  g.sessions.reverse();
              });
              ungrouped.reverse();

              return (
                <div className="space-y-4">
                  {groups.map((group, i) => (
                    <div key={`group-${i}`} className="space-y-1">
                      <div 
                        onContextMenu={(e) => handleContextMenu(e, 'group', undefined, group.title, group.sessions.map((s:any) => s.id), group.sessions)}
                        className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 border-b border-gray-800 pb-1 flex justify-between items-center group cursor-context-menu"
                      >
                        <div className="flex items-center space-x-2 overflow-hidden flex-1">
                          <button 
                            onClick={() => toggleGroup(i)}
                            className="p-1 -ml-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                            title="Toggle Group"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedGroups.has(i) ? '-rotate-90' : ''}`} />
                          </button>
                          <span 
                            className="truncate cursor-pointer hover:text-purple-400 hover:underline transition-colors" 
                            title="Open latest session"
                            onClick={() => {
                                setSelectedSession(group.sessions[0]);
                            }}
                          >
                            {group.title}
                          </span>
                          <span className="text-gray-600 flex-shrink-0">({group.sessions.length})</span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-gray-500 font-mono flex items-center"><Clock className="w-3 h-3 mr-1"/> {group.lastTime}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateTitle(group.sessions);
                            }}
                            disabled={isGeneratingTitle}
                            title="Generate title for this group"
                            className="p-1 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {!collapsedGroups.has(i) && group.sessions.map((session: any, j: number) => (
                        <div
                          key={`session-${i}-${j}`}
                          onClick={() => setSelectedSession(session)}
                          onContextMenu={(e) => handleContextMenu(e, 'session', session.id)}
                          className={`
                            p-2 mx-2 rounded-lg border text-sm cursor-pointer transition-all
                            ${selectedSession?.id === session.id 
                                ? 'bg-purple-900/20 border-purple-500/50 text-purple-100' 
                                : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750 text-gray-300'
                            }
                          `}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              session.status_code >= 200 && session.status_code < 300 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                            }`}>
                              {session.status_code}
                            </span>
                            <div className="flex items-center text-[10px] text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(session.created_at.replace(' ', 'T') + (session.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-[10px] truncate text-gray-400" title={session.endpoint}>
                            {session.endpoint}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {ungrouped.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 border-b border-gray-800 pb-1 mt-4">
                        Other Requests ({ungrouped.length})
                      </div>
                      {ungrouped.map((session, j) => (
                         <div
                           key={`ungrouped-${j}`}
                           onClick={() => setSelectedSession(session)}
                           onContextMenu={(e) => handleContextMenu(e, 'session', session.id)}
                           className={`
                             p-2 mx-2 rounded-lg border text-sm cursor-pointer transition-all
                             ${selectedSession?.id === session.id 
                                 ? 'bg-purple-900/20 border-purple-500/50 text-purple-100' 
                                 : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750 text-gray-300'
                             }
                           `}
                         >
                           <div className="flex justify-between items-start mb-1">
                             <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                               session.status_code >= 200 && session.status_code < 300 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                             }`}>
                               {session.status_code}
                             </span>
                             <div className="flex items-center text-[10px] text-gray-500">
                               <Clock className="w-3 h-3 mr-1" />
                               {new Date(session.created_at).toLocaleTimeString()}
                             </div>
                           </div>
                           <div className="text-[10px] truncate text-gray-400" title={session.endpoint}>
                             {session.endpoint}
                           </div>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Main Area: Payload Viewer */}
      <div className="flex-1 bg-[#1e1e1e] flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-sm font-semibold text-gray-200">{selectedSession.improved_title || "Session Payload"}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">ID: {selectedSession.id}</p>
              </div>
              <div className="flex bg-gray-800 rounded-lg p-1 items-center space-x-2">
                <label className="flex items-center space-x-2 text-xs text-gray-400 mr-4 cursor-pointer hover:text-gray-200">
                  <input 
                    type="checkbox" 
                    checked={collapseXmlMode} 
                    onChange={e => setCollapseXmlMode(e.target.checked)} 
                    className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Smart Collapse XML</span>
                </label>
                <button
                  onClick={handleDownload}
                  title="Download MD/JSON"
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-md transition-colors mr-2"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'raw' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Raw JSON
                </button>
                <button
                  onClick={() => setViewMode('markdown')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'markdown' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Markdown Chat
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              {viewMode === 'raw' ? (
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="vs-dark"
                  value={formatRawPayload(selectedSession.full_payload)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 16 },
                  }}
                />
              ) : (
                <div className="absolute inset-0 overflow-y-auto p-4 bg-gray-950">
                  {(() => {
                    const parsedMessages = parseMarkdownChat(selectedSession.full_payload);
                    if (parsedMessages.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <p>No chat data could be parsed from this payload.</p>
                        </div>
                      );
                    }
                    return (
                      <ChatViewer messages={parsedMessages} collapseXmlMode={collapseXmlMode} />
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Database className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-400">Select a session to view</p>
          </div>
        )}
      </div>
      {contextMenu && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 w-48 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'session' && (
            <>
              <button 
                onClick={() => { navigator.clipboard.writeText(contextMenu.sessionId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-300"
              >
                Copy Session ID
              </button>
              <button 
                onClick={() => { handleDeleteSession(contextMenu.sessionId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-900/50 text-red-400"
              >
                Delete Session
              </button>
            </>
          )}
          {contextMenu.type === 'group' && (
            <>
              <button 
                onClick={() => { handleExportGroup(contextMenu.sessions!, contextMenu.groupId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-300"
              >
                Export Group
              </button>
              <button 
                onClick={() => { handleCleanupGroup(contextMenu.sessionIds!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-300"
              >
                Cleanup Redundant
              </button>
              <div className="h-px bg-gray-700 my-1"></div>
              <button 
                onClick={() => { handleDeleteGroup(contextMenu.sessionIds!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-900/50 text-red-400"
              >
                Delete Group
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
