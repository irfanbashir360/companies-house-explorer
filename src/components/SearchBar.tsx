import React, { useState, useEffect } from 'react';
import { Search, Building2, User, Loader2 } from 'lucide-react';
import { companiesHouseAPI } from '../services/companiesHouse';

interface SearchResult {
  id: string;
  name: string;
  type: 'company' | 'officer';
  subtitle?: string;
  status?: string;
  dateOfCreation?: string;
  companyType?: string;
  appointmentCount?: number;
  address?: string;
  data?: any;
}

interface SearchBarProps {
  onSelectCompany: (companyNumber: string, companyName: string) => void;
  onSelectOfficer: (officerId: string, officerName: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectCompany,
  onSelectOfficer,
}) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'company' | 'officer'>('company');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (searchType === 'company') {
          const data = await companiesHouseAPI.searchCompanies(query, 10);
          setResults(
            data.items.map((item) => ({
              id: item.company_number,
              name: item.company_name || `Company ${item.company_number}`,
              type: 'company',
              subtitle: item.address_snippet || '',
              status: item.company_status,
              dateOfCreation: item.date_of_creation,
              companyType: item.company_type,
              data: item,
            }))
          );
        } else {
          const data = await companiesHouseAPI.searchOfficers(query, 10);
          setResults(
            data.items.map((item) => {
              // Extract officer ID from self link
              const officerId = item.links?.self?.split('/').pop() || '';
              return {
                id: officerId,
                name: item.title,
                type: 'officer',
                subtitle: item.description || '',
                appointmentCount: item.appointment_count || 0,
                address: item.address_snippet,
                data: item,
              };
            })
          );
        }
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'company') {
      onSelectCompany(result.id, result.name);
    } else {
      onSelectOfficer(result.id, result.name);
    }
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative z-50">
      <div className="flex gap-3">
        {/* Search Type Toggle */}
        <div className="flex bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setSearchType('company')}
            className={`flex items-center gap-2 px-4 py-2.5 transition-all duration-200 ${searchType === 'company'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Company</span>
          </button>
          <button
            onClick={() => setSearchType('officer')}
            className={`flex items-center gap-2 px-4 py-2.5 transition-all duration-200 ${searchType === 'officer'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Officer</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 z-50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) {
                  setShowResults(true);
                }
              }}
              onBlur={(e) => {
                // Don't hide if clicking on results
                if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) {
                  setTimeout(() => setShowResults(false), 200);
                }
              }}
              placeholder={
                searchType === 'company'
                  ? 'Search companies by name or number...'
                  : 'Search officers by name...'
              }
              className="w-full pl-11 pr-11 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none text-sm bg-white transition-all"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin pointer-events-none" />
            )}
          </div>

          {/* Results Dropdown */}
          {showResults && results.length > 0 && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[100]"
                onClick={() => setShowResults(false)}
              />

              {/* Results */}
              <div className="absolute z-[110] w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[28rem] overflow-hidden">
                <div className="overflow-y-auto scrollbar-thin">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => handleSelect(result)}
                      className="w-full px-5 py-4 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Simple Icon */}
                        <div className="mt-0.5 flex-shrink-0">
                          {result.type === 'company' ? (
                            <Building2 className="w-5 h-5 text-slate-700" />
                          ) : (
                            <User className="w-5 h-5 text-slate-700" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-semibold text-slate-950 text-base leading-snug">
                              {result.name || result.id || 'Unknown'}
                            </h3>
                            {result.type === 'company' && result.status && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${result.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : result.status === 'dissolved'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                {result.status}
                              </span>
                            )}
                          </div>

                          {/* Company Details */}
                          {result.type === 'company' && (
                            <div className="space-y-1.5">
                              {result.id && (
                                <div className="text-sm text-slate-600 font-mono">
                                  {result.id}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                {result.companyType && (
                                  <span className="capitalize">{result.companyType.replace(/-/g, ' ')}</span>
                                )}
                                {result.dateOfCreation && (
                                  <span>{new Date(result.dateOfCreation).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                )}
                              </div>
                              {result.subtitle && (
                                <div className="text-sm text-slate-600 leading-relaxed">
                                  {result.subtitle}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Officer Details */}
                          {result.type === 'officer' && (
                            <div className="space-y-1.5">
                              {result.subtitle && (
                                <div className="text-sm text-slate-600 leading-relaxed">
                                  {result.subtitle}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                {result.appointmentCount !== undefined && (
                                  <span>
                                    {result.appointmentCount} {result.appointmentCount === 1 ? 'appointment' : 'appointments'}
                                  </span>
                                )}
                                {result.address && (
                                  <span className="truncate max-w-[300px]">{result.address}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
