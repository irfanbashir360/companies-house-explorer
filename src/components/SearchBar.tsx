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
              name: item.title || `Company ${item.company_number}`,
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

  const statusClass = (status?: string) =>
    status === 'active' ? 'text-teal' : status === 'dissolved' ? 'text-muted' : 'text-amber';

  return (
    <div className="relative z-50 w-full">
      <div className="flex items-center h-10 rounded-lg border border-line bg-white focus-within:border-nexis focus-within:ring-2 focus-within:ring-nexis/15 transition-colors">
        {/* What to search for */}
        <div className="flex h-full p-1 gap-0.5" role="radiogroup" aria-label="Search for">
          {(['company', 'officer'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={searchType === type}
              onClick={() => setSearchType(type)}
              className={`flex items-center gap-1.5 px-2.5 rounded-md text-[13px] font-bold transition-colors ${
                searchType === type ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {type === 'company' ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{type === 'company' ? 'Company' : 'Officer'}</span>
              <span className="sr-only sm:hidden">{type === 'company' ? 'Company' : 'Officer'}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0 h-full">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/70 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
            onBlur={(e) => {
              // Don't hide if clicking on results
              if (!e.currentTarget.parentElement?.parentElement?.parentElement?.contains(e.relatedTarget as Node)) {
                setTimeout(() => setShowResults(false), 200);
              }
            }}
            placeholder={
              searchType === 'company' ? 'Company name or number' : 'Officer name'
            }
            aria-label={searchType === 'company' ? 'Search companies' : 'Search officers'}
            className="w-full h-full pl-8 pr-9 bg-transparent outline-none text-sm text-ink placeholder:text-muted/60"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin pointer-events-none" />
          )}
        </div>
      </div>

      {/* Results */}
      {showResults && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowResults(false)} />
          <ul className="absolute z-[110] w-full mt-1.5 bg-white border border-line rounded-lg shadow-[0_12px_32px_-12px_rgba(0,23,46,0.25)] max-h-[26rem] overflow-y-auto scrollbar-thin py-1">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-2.5 text-left hover:bg-canvas focus-visible:bg-canvas transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-bold text-ink text-sm leading-snug">
                      {result.name || result.id || 'Unnamed'}
                    </span>
                    {result.type === 'company' && result.status && (
                      <span className={`text-xs font-bold capitalize shrink-0 ${statusClass(result.status)}`}>
                        {result.status}
                      </span>
                    )}
                    {result.type === 'officer' && result.appointmentCount !== undefined && (
                      <span className="text-xs text-muted shrink-0 tabular">
                        {result.appointmentCount} {result.appointmentCount === 1 ? 'appointment' : 'appointments'}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted flex flex-wrap gap-x-3">
                    {result.type === 'company' && <span className="tabular">No. {result.id}</span>}
                    {result.type === 'company' && result.dateOfCreation && (
                      <span>
                        Incorporated{' '}
                        {new Date(result.dateOfCreation).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {(result.subtitle || result.address) && (
                      <span className="truncate max-w-full">{result.type === 'company' ? result.subtitle : result.address}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
