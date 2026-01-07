import type { FormEvent } from 'react';

type SearchBarProps = {
  query: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export default function SearchBar({
  query,
  isSearching,
  onQueryChange,
  onSubmit,
}: SearchBarProps) {
  return (
    <form className="search-bar" onSubmit={onSubmit}>
      <input
        type="search"
        placeholder="Search the collection"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label="Search the Met collection"
      />
      <button type="submit" disabled={isSearching}>
        {isSearching ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}
