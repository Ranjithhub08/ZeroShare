import React from 'react';
import SearchResultItem from './SearchResultItem';
import { Card } from '@/components/ui/card';
import { Database, Shield, Activity, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const SearchResultsPanel = ({ results, query, onResultClick }) => {
  const hasResults = Object.values(results).some(arr => arr.length > 0);

  if (!hasResults && query.length >= 2) {
    return (
      <Card className="p-12 shadow-2xl border bg-popover/95 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No results found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
            No records matched your search query "{query}"
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-h-[min(450px,70vh)] overflow-hidden shadow-2xl border bg-popover/95 backdrop-blur-xl flex flex-col">
      <div className="overflow-y-auto p-2 space-y-4">
        {results.data_vault.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <Database className="h-3 w-3" />
              Data Vault
            </div>
            {results.data_vault.map((item) => (
              <SearchResultItem 
                key={item.id} 
                item={item} 
                type="data" 
                onClick={onResultClick} 
              />
            ))}
          </div>
        )}

        {results.consents.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <Shield className="h-3 w-3" />
              Consents
            </div>
            {results.consents.map((item) => (
              <SearchResultItem 
                key={item.id} 
                item={item} 
                type="consent" 
                onClick={onResultClick} 
              />
            ))}
          </div>
        )}

        {results.audit_logs.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <Activity className="h-3 w-3" />
              Audit Logs
            </div>
            {results.audit_logs.map((item) => (
              <SearchResultItem 
                key={item.id} 
                item={item} 
                type="audit" 
                onClick={onResultClick} 
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 border-t bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground px-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 px-1">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 px-1">↵</kbd> Select
          </span>
        </div>
        <span>ZeroShare Search Engine</span>
      </div>
    </Card>
  );
};

export default SearchResultsPanel;
