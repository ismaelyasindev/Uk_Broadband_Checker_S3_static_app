import { useEffect, useId, useRef, useState } from 'react';
import axios from 'axios';
import {
  autocompletePostcode,
  lookupPostcode,
  type ValidatedPostcode,
} from '../lib/postcodesIo';
import { isStructurallyValidPostcode, normalizePostcode } from '../lib/postcode';
import { SearchIcon, SpinnerIcon } from './icons';

interface SearchBarProps {
  /** Called with the full postcodes.io-validated record (including coordinates). */
  onValidated: (validated: ValidatedPostcode) => void;
  /** True while a downstream broadband lookup is running. */
  busy: boolean;
}

export function SearchBar({ onValidated, busy }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const structurallyValid = isStructurallyValidPostcode(query);

  // Debounced autocomplete against postcodes.io while the user types.
  useEffect(() => {
    const q = normalizePostcode(query);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await autocompletePostcode(q, controller.signal);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setSuggestions([]);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function validateAndSubmit(candidate: string) {
    setError(null);

    if (!isStructurallyValidPostcode(candidate)) {
      setError('Please enter a valid UK postcode.');
      return;
    }

    setValidating(true);
    try {
      const validated = await lookupPostcode(candidate);
      if (!validated) {
        setError('That postcode could not be found. Please check and try again.');
        return;
      }
      setOpen(false);
      setQuery(validated.postcode);
      onValidated(validated);
    } catch {
      setError('Could not verify the postcode right now. Please try again.');
    } finally {
      setValidating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void validateAndSubmit(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const chosen = suggestions[activeIndex];
      setQuery(chosen);
      void validateAndSubmit(chosen);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const pending = validating || busy;

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="group relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute transition-colors group-focus-within:text-flare">
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase());
              setError(null);
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a UK postcode, e.g. SW1A 1AA"
            aria-label="UK postcode"
            aria-invalid={Boolean(error)}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            role="combobox"
            className="nums w-full rounded-2xl border hairline bg-paper py-4 pl-12 pr-4 text-base font-medium text-ink placeholder:font-sans placeholder:text-ink-mute/70 shadow-sm transition-all focus:border-flare/50 focus:bg-paper-card focus:shadow-lift"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !structurallyValid}
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-ink px-7 py-4 text-base font-semibold text-paper shadow-lift transition-all hover:bg-flare-deep disabled:cursor-not-allowed disabled:bg-ink/40 disabled:shadow-none"
        >
          {pending ? (
            <>
              <SpinnerIcon className="h-5 w-5 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              Check availability
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </>
          )}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="animate-fade-in absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border hairline bg-paper-card p-1.5 shadow-ring sm:w-[calc(100%-10rem)]"
        >
          {suggestions.map((s, i) => (
            <li key={s} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  setQuery(s);
                  void validateAndSubmit(s);
                }}
                className={`nums flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                  i === activeIndex
                    ? 'bg-flare-soft text-flare-deep'
                    : 'text-ink-soft hover:bg-paper-sunk'
                }`}
              >
                <SearchIcon
                  className={`h-4 w-4 ${i === activeIndex ? 'text-flare' : 'opacity-40'}`}
                />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
