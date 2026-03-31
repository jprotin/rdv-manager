import { useState, useEffect, useRef } from 'react';
import { searchAddress } from '../../services/addressApi.js';

export default function AddressSearch({ value, onChange, placeholder }) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value?.label && value.label !== query) setQuery(value.label);
  }, [value?.label]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const addresses = await searchAddress(query);
        setResults(addresses);
        setOpen(addresses.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (address) => {
    setQuery(address.label);
    setResults([]);
    setOpen(false);
    onChange(address);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onChange(null);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input pr-8"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          placeholder={placeholder || 'Rechercher une adresse...'}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">...</span>
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 leading-none"
          >
            ×
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {results.map((addr, i) => (
            <li
              key={i}
              className="px-3 py-2.5 hover:bg-primary-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
              onMouseDown={() => handleSelect(addr)}
            >
              <span className="font-medium">{addr.label}</span>
            </li>
          ))}
        </ul>
      )}

      {value && (
        <p className="mt-1 text-xs text-primary-600 font-medium">
          ✓ {value.city} ({value.postcode})
        </p>
      )}
    </div>
  );
}
