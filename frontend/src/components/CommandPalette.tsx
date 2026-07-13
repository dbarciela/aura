import { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight } from 'lucide-react';
import { commandRegistry, searchProviders, type SearchResultItem } from '../plugins/PluginRegistry';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    let active = true;

    const fetchResults = async () => {
      // 1. Filter static commands
      const staticMatches = commandRegistry
        .filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
        .map(c => ({
          id: c.id,
          title: c.title,
          icon: c.icon,
          section: c.section || 'Commands',
          perform: c.perform
        }));

      if (!query.trim()) {
        setResults(staticMatches);
        setSelectedIndex(0);
        return;
      }

      // 2. Query dynamic providers
      try {
        const dynamicPromises = searchProviders.map(p => p.search(query));
        const dynamicResults = await Promise.all(dynamicPromises);
        const flattenedDynamic = dynamicResults.flat();

        if (active) {
          setResults([...staticMatches, ...flattenedDynamic]);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Error fetching search results", err);
      }
    };

    fetchResults();
    return () => { active = false; };
  }, [query, isOpen]);

  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (results.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].perform();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [isOpen, results, selectedIndex]);

  if (!isOpen) return null;

  // Group results by section
  const groupedResults = results.reduce((acc, curr) => {
    const section = curr.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(curr);
    return acc;
  }, {} as Record<string, SearchResultItem[]>);

  // Flatten for global index calculation
  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[70vh]">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-gray-800 bg-gray-900/50">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-100 text-lg placeholder-gray-500"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center space-x-1 ml-3 shrink-0">
            <kbd className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs font-mono font-medium border border-gray-700">ESC</kbd>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {results.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 flex flex-col items-center">
              <Command className="w-8 h-8 mb-3 opacity-20" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            Object.entries(groupedResults).map(([section, items]) => (
              <div key={section} className="mb-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section}
                </div>
                <div className="px-2">
                  {items.map((item) => {
                    const isSelected = globalIndex === selectedIndex;
                    const currentIndex = globalIndex++;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        onClick={() => { item.perform(); setIsOpen(false); }}
                        className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <div className={`mr-3 shrink-0 flex items-center justify-center w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {item.icon || <ArrowRight className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="ml-3 shrink-0 flex items-center text-xs opacity-70">
                            <span className="mr-1">Press</span>
                            <kbd className="font-mono bg-black/20 px-1.5 py-0.5 rounded">↵</kbd>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center"><kbd className="font-mono px-1 bg-gray-800 rounded mr-1">↑</kbd><kbd className="font-mono px-1 bg-gray-800 rounded mr-1">↓</kbd> to navigate</span>
            <span className="flex items-center"><kbd className="font-mono px-1 bg-gray-800 rounded mr-1">↵</kbd> to select</span>
          </div>
          <div>Aura Command Palette</div>
        </div>

      </div>
    </div>
  );
}
