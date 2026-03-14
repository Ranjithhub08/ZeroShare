import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchResultsPanel from './SearchResultsPanel';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const GlobalSearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ data_vault: [], consents: [], audit_logs: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await fetch(`http://localhost:5001/api/search?q=${encodeURIComponent(query)}`);
          const json = await res.json();
          if (json.success) {
            setResults(json.results);
            setIsOpen(true);
          }
        } catch (error) {
          console.error('Search fetch failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults({ data_vault: [], consents: [], audit_logs: [] });
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          )}
        </div>
        
        <Input
          type="text"
          placeholder="Search ZeroShare..."
          className="pl-9 pr-12 h-9 bg-muted/30 focus-visible:ring-1 focus-visible:bg-background transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <AnimatePresence>
            {query && (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
          
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 right-0 z-50 overflow-hidden"
          >
            <SearchResultsPanel 
              results={results} 
              query={query} 
              onResultClick={() => setIsOpen(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearchBar;
