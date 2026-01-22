import React from 'react';
import { Clock, Building2, User, X, Trash2 } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

interface SearchHistoryProps {
  onSelectCompany: (companyNumber: string, companyName: string) => void;
  onSelectOfficer: (officerId: string, officerName: string) => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSelectCompany,
  onSelectOfficer,
}) => {
  const { searchHistory, clearHistory } = useGraphStore();

  if (searchHistory.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Clock className="w-4 h-4 text-slate-700" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base">Search History</h3>
        </div>
        <p className="text-sm text-slate-500 text-center py-4">
          Your search history will appear here
        </p>
      </div>
    );
  }

  const handleSelect = (item: (typeof searchHistory)[0]) => {
    if (!item.result) return;

    if (item.type === 'company') {
      onSelectCompany(item.result.id, item.result.name);
    } else {
      onSelectOfficer(item.result.id, item.result.name);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
      <div className="flex items-center justify-between p-5 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Clock className="w-4 h-4 text-slate-700" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base">Search History</h3>
        </div>
        <button
          onClick={clearHistory}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 transition-colors uppercase tracking-wide"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto scrollbar-thin">
        {searchHistory.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            disabled={!item.result}
            className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {item.type === 'company' ? (
                  <Building2 className="w-4 h-4 text-slate-700" />
                ) : (
                  <User className="w-4 h-4 text-slate-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {item.result?.name || item.query}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 capitalize font-medium">
                    {item.type}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-400">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
