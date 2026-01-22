import React from 'react';
import {
  Building2,
  User,
  Shield,
  FileText,
  Link as LinkIcon,
  MapPin,
  Filter,
} from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

export const FilterPanel: React.FC = () => {
  const { filters, setFilter } = useGraphStore();

  const filterOptions: Array<{
    key: keyof typeof filters;
    label: string;
    icon: React.FC<{ className?: string }>;
    color: string;
  }> = [
      {
        key: 'companies',
        label: 'Companies',
        icon: Building2,
        color: 'text-blue-500',
      },
      {
        key: 'officers',
        label: 'Officers',
        icon: User,
        color: 'text-purple-500',
      },
      {
        key: 'pscs',
        label: 'PSCs',
        icon: Shield,
        color: 'text-pink-500',
      },
      {
        key: 'charges',
        label: 'Charges',
        icon: LinkIcon,
        color: 'text-amber-500',
      },
      {
        key: 'filings',
        label: 'Filings',
        icon: FileText,
        color: 'text-green-500',
      },
      {
        key: 'establishments',
        label: 'Establishments',
        icon: MapPin,
        color: 'text-cyan-500',
      },
    ];

  const allEnabled = Object.values(filters).every((v) => v);

  const toggleAll = () => {
    const newValue = !allEnabled;
    Object.keys(filters).forEach((key) => {
      setFilter(key as keyof typeof filters, newValue);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Filter className="w-4 h-4 text-slate-700" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base">Filters</h3>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors uppercase tracking-wide"
        >
          {allEnabled ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-1.5">
        {filterOptions.map(({ key, label, icon: Icon, color }) => (
          <label
            key={key}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters[key]}
              onChange={(e) => setFilter(key, e.target.checked)}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-500 focus:ring-2 cursor-pointer"
            />
            <Icon className={`w-4 h-4 ${color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm font-medium text-slate-700 flex-1">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
