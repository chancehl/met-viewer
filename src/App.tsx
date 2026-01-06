import { useMemo, useRef, useState } from 'react';

type MetSearchResponse = {
  total: number;
  objectIDs?: number[];
};

type MetObject = {
  objectID: number;
  title: string;
  primaryImage: string;
  primaryImageSmall: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  objectDate: string;
  medium: string;
  dimensions: string;
  culture: string;
  department: string;
  creditLine: string;
  objectName: string;
  repository: string;
};

const PAGE_SIZE = 100;
const API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const MAX_CONCURRENT = 6;
const MIN_DELAY_MS = 80;

const fetchObject = async (
  objectID: number,
  signal?: AbortSignal,
): Promise<MetObject> => {
  const response = await fetch(`${API_BASE}/objects/${objectID}`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load object ${objectID}`);
  }
  return response.json();
};

const runWithConcurrency = async <T,>(
  items: number[],
  handler: (id: number) => Promise<T | null>,
  maxConcurrent: number,
  minDelayMs: number,
  onItem?: (value: T) => void,
): Promise<T[]> => {
  const results: T[] = [];
  let currentIndex = 0;
  let active = 0;
  let lastStart = 0;

  return new Promise((resolve, reject) => {
    const startNext = () => {
      if (currentIndex >= items.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < maxConcurrent && currentIndex < items.length) {
        const id = items[currentIndex++];
        const now = Date.now();
        const wait = Math.max(0, minDelayMs - (now - lastStart));
        lastStart = now + wait;
        active += 1;

        setTimeout(() => {
          handler(id)
            .then((value) => {
              if (value) {
                results.push(value);
                if (onItem) {
                  onItem(value);
                }
              }
            })
            .catch(reject)
            .finally(() => {
              active -= 1;
              startNext();
            });
        }, wait);
      }
    };

    startNext();
  });
};

const formatArtist = (object: MetObject) => {
  if (object.artistDisplayName && object.artistDisplayBio) {
    return `${object.artistDisplayName} — ${object.artistDisplayBio}`;
  }
  return object.artistDisplayName || object.culture || 'Unknown';
};

const buildDefaultFilename = (object: MetObject) => {
  const safeTitle = object.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return safeTitle || `met-${object.objectID}`;
};

export default function App() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [objectIDs, setObjectIDs] = useState<number[]>([]);
  const [items, setItems] = useState<MetObject[]>([]);
  const [selected, setSelected] = useState<MetObject | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MetObject | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const searchIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<number, MetObject>>(new Map());

  const isEmptyState = useMemo(
    () =>
      !isSearching && !items.length && !objectIDs.length && !submittedQuery,
    [isSearching, items.length, objectIDs.length, submittedQuery],
  );

  const runSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      handleClear();
      return;
    }

    const searchId = searchIdRef.current + 1;
    searchIdRef.current = searchId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError('');
    setIsSearching(true);
    setSubmittedQuery(trimmed);
    setItems([]);
    setObjectIDs([]);
    setSelected(null);
    setSelectedDetails(null);

    try {
      const response = await fetch(
        `${API_BASE}/search?hasImages=true&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error('Search request failed');
      }
      const data = (await response.json()) as MetSearchResponse;
      const ids = (data.objectIDs ?? []).slice(0, PAGE_SIZE);
      if (searchIdRef.current !== searchId) {
        return;
      }
      setObjectIDs(ids);
      if (ids.length > 0) {
        await loadNextPage(ids, searchId, controller.signal);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      if (searchIdRef.current === searchId) {
        setIsSearching(false);
      }
    }
  };

  const loadNextPage = async (
    ids = objectIDs,
    searchId = searchIdRef.current,
    signal?: AbortSignal,
  ) => {
    if (searchIdRef.current !== searchId) {
      return;
    }
    if (!ids.length) {
      return;
    }
    await runWithConcurrency(
      ids,
      async (id) => {
        const cached = cacheRef.current.get(id);
        if (cached) {
          return cached;
        }
        try {
          const item = await fetchObject(id, signal);
          if (!item.primaryImageSmall && !item.primaryImage) {
            return null;
          }
          cacheRef.current.set(id, item);
          return item;
        } catch {
          return null;
        }
      },
      MAX_CONCURRENT,
      MIN_DELAY_MS,
      (value) => {
        setItems((prev) => {
          if (prev.find((item) => item.objectID === value.objectID)) {
            return prev;
          }
          return [...prev, value];
        });
      },
    );
    if (searchIdRef.current !== searchId) {
      return;
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch(query);
  };

  const handleClear = () => {
    searchIdRef.current += 1;
    abortRef.current?.abort();
    setQuery('');
    setSubmittedQuery('');
    setItems([]);
    setObjectIDs([]);
    setIsSearching(false);
    setError('');
    setSelected(null);
    setSelectedDetails(null);
    setDownloadStatus('');
  };

  const handleSelect = (item: MetObject) => {
    setSelected(item);
    setSelectedDetails(null);
    setDetailsLoading(true);
    setDownloadStatus('');
    const cached = cacheRef.current.get(item.objectID);
    if (cached) {
      setSelectedDetails(cached);
      setDetailsLoading(false);
      return;
    }
    fetchObject(item.objectID)
      .then((details) => {
        cacheRef.current.set(item.objectID, details);
        setSelectedDetails(details);
      })
      .catch(() => setSelectedDetails(item))
      .finally(() => setDetailsLoading(false));
  };

  const handleDownload = async () => {
    if (!selectedDetails) {
      return;
    }
    const url = selectedDetails.primaryImage || selectedDetails.primaryImageSmall;
    if (!url) {
      setDownloadStatus('No image available for download.');
      return;
    }
    setDownloadStatus('Saving...');
    try {
      const result = await window.metViewer.saveImage(
        url,
        buildDefaultFilename(selectedDetails),
      );
      if (result.canceled) {
        setDownloadStatus('Download canceled.');
      } else if (result.error) {
        setDownloadStatus(result.error);
      } else {
        setDownloadStatus('Saved to disk.');
      }
    } catch (err) {
      setDownloadStatus(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const activeDetails = selectedDetails || selected;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">The Met Viewer</p>
          <h1>Search the collection</h1>
        </div>
        <button className="ghost-button" type="button" onClick={handleClear}>
          Clear
        </button>
      </header>

      <main className="content">
        {isEmptyState && (
          <div className="empty-state">
            <h2>Search to get started</h2>
            <p>Discover highlights, hidden gems, and everything in-between.</p>
          </div>
        )}

        {isSearching && !items.length && (
          <div className="empty-state">
            <h2>Searching…</h2>
            <p>Gathering artworks from the collection.</p>
          </div>
        )}

        {!isSearching &&
          submittedQuery &&
          !items.length &&
          !objectIDs.length &&
          !error && (
          <div className="empty-state">
            <h2>No results</h2>
            <p>Try a different search term or explore another keyword.</p>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {!!items.length && (
          <>
            <div className="mosaic-grid">
              {items.map((item) => (
                <button
                  key={item.objectID}
                  className="mosaic-card"
                  type="button"
                  onClick={() => handleSelect(item)}
                >
                  <img
                    src={item.primaryImageSmall || item.primaryImage}
                    alt={item.title}
                    loading="lazy"
                  />
                  <div className="mosaic-caption">
                    <span>{item.title}</span>
                    <small>{item.objectDate || item.objectName}</small>
                  </div>
                </button>
              ))}
            </div>
            <div className="sentinel">Showing up to {PAGE_SIZE} results.</div>
          </>
        )}
      </main>

      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="search"
          placeholder="Search the collection..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search the Met collection"
        />
        <button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {activeDetails && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="close-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
            {detailsLoading && <p className="loading">Loading details…</p>}
            {activeDetails && (
              <div className="modal-body">
                <div className="modal-image">
                  <img
                    src={
                      activeDetails.primaryImage ||
                      activeDetails.primaryImageSmall
                    }
                    alt={activeDetails.title}
                  />
                </div>
                <div className="modal-info">
                  <h2>{activeDetails.title}</h2>
                  <p className="artist">{formatArtist(activeDetails)}</p>
                  <div className="meta-grid">
                    <div>
                      <span>Medium</span>
                      <strong>{activeDetails.medium || '—'}</strong>
                    </div>
                    <div>
                      <span>Date</span>
                      <strong>{activeDetails.objectDate || '—'}</strong>
                    </div>
                    <div>
                      <span>Dimensions</span>
                      <strong>{activeDetails.dimensions || '—'}</strong>
                    </div>
                    <div>
                      <span>Department</span>
                      <strong>{activeDetails.department || '—'}</strong>
                    </div>
                    <div>
                      <span>Location</span>
                      <strong>{activeDetails.repository || '—'}</strong>
                    </div>
                    <div>
                      <span>Credit</span>
                      <strong>{activeDetails.creditLine || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button
                type="button"
                className="primary-button"
                onClick={handleDownload}
                disabled={!activeDetails?.primaryImage}
              >
                Download
              </button>
              {downloadStatus && <span className="download-status">{downloadStatus}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
