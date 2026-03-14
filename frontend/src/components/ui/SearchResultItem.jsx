import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Shield, Activity, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const SearchResultItem = ({ item, type, onClick }) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (type) {
      case 'data': return <Database className="h-3.5 w-3.5" />;
      case 'consent': return <Shield className="h-3.5 w-3.5" />;
      case 'audit': return <Activity className="h-3.5 w-3.5" />;
      default: return <Database className="h-3.5 w-3.5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'data': return item.data_type;
      case 'consent': return item.app_name;
      case 'audit': return item.event_type;
      default: return 'Result';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'data': return `ID: ${item.id.slice(0, 8)}...`;
      case 'consent': return item.purpose;
      case 'audit': return item.app_name;
      default: return '';
    }
  };

  const getPath = () => {
    switch (type) {
      case 'data': return '/vault';
      case 'consent': return '/consents';
      case 'audit': return '/audit';
      default: return '/dashboard';
    }
  };

  const handleSelect = () => {
    navigate(getPath());
    onClick();
  };

  return (
    <button
      onClick={handleSelect}
      className="w-full flex items-center justify-between p-2 rounded-md transition-all hover:bg-accent group text-left"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-background transition-colors">
          {getIcon()}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold truncate max-w-[200px]">{getTitle()}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[200px] leading-tight">
            {getSubtitle()}
          </span>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
    </button>
  );
};

export default SearchResultItem;
