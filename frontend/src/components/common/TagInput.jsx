import { useState, useEffect, useRef } from 'react';
import { tagsService } from '../../services/firestore.js';

export default function TagInput({ value = [], onChange }) {
  const [allTags, setAllTags]       = useState([]);
  const [inputVal, setInputVal]     = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]             = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    tagsService.getAll().then(setAllTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (!inputVal.trim()) { setSuggestions([]); setOpen(false); return; }
    const q = inputVal.toLowerCase();
    const filtered = allTags.filter(t => t.name.includes(q) && !value.includes(t.name));
    setSuggestions(filtered);
    setOpen(true);
  }, [inputVal, allTags, value]);

  const addTag = (name) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized || value.includes(normalized)) return;
    onChange([...value, normalized]);
    setInputVal('');
    setSuggestions([]);
    setOpen(false);
  };

  const removeTag = (tag) => onChange(value.filter(t => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim()) addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleCreateNew = () => {
    const name = inputVal.trim();
    if (!name) return;
    addTag(name);
  };

  const exactMatch = allTags.some(t => t.name === inputVal.trim().toLowerCase());
  const showDropdown = open && (suggestions.length > 0 || (inputVal.trim() && !exactMatch));

  return (
    <div className="relative">
      <div
        className="min-h-[42px] w-full px-2 py-1.5 border border-ink-200 rounded-xl bg-white flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-transparent"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-primary-400 hover:text-primary-700 leading-none text-base">×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputVal && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={value.length === 0 ? 'Ajouter des tags...' : ''}
          className="flex-1 min-w-[100px] outline-none text-sm text-ink-700 placeholder:text-ink-300 bg-transparent py-0.5"
        />
      </div>

      {showDropdown && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-ink-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map(tag => (
            <li
              key={tag._id}
              onMouseDown={() => addTag(tag.name)}
              className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm text-ink-700"
            >
              {tag.name}
            </li>
          ))}
          {inputVal.trim() && !exactMatch && (
            <li
              onMouseDown={handleCreateNew}
              className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm text-primary-600 font-medium border-t border-ink-100"
            >
              + Créer « {inputVal.trim()} »
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
