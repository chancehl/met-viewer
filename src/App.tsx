import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
const MAX_CONCURRENT = 3;
const MIN_DELAY_MS = 200;

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
  const [selected, setSelected] = useState<MetObject | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MetObject | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [loadedById, setLoadedById] = useState<Record<number, MetObject>>({});
  const searchIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<number, MetObject>>(new Map());
  const queueRef = useRef<number[]>([]);
  const pendingRef = useRef<Set<number>>(new Set());
  const activeRef = useRef(0);
  const lastStartRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tileRefs = useRef<Set<HTMLButtonElement>>(new Set());

  const loadedCount = useMemo(
    () => Object.keys(loadedById).length,
    [loadedById],
  );

  const isEmptyState = useMemo(
    () =>
      !isSearching && !loadedCount && !objectIDs.length && !submittedQuery,
    [isSearching, loadedCount, objectIDs.length, submittedQuery],
  );

  const processQueue = useCallback(
    (searchId: number, signal?: AbortSignal) => {
      while (activeRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
        const id = queueRef.current.shift();
        if (id === undefined) {
          continue;
        }
        activeRef.current += 1;
        const now = Date.now();
        const wait = Math.max(0, MIN_DELAY_MS - (now - lastStartRef.current));
        lastStartRef.current = now + wait;

        setTimeout(async () => {
          try {
            if (searchIdRef.current !== searchId) {
              return;
            }
            const cached = cacheRef.current.get(id);
            if (cached) {
              setLoadedById((prev) => {
                if (prev[id]) {
                  return prev;
                }
                return { ...prev, [id]: cached };
              });
              return;
            }
            const item = await fetchObject(id, signal);
            if (!item.primaryImageSmall && !item.primaryImage) {
              return;
            }
            cacheRef.current.set(id, item);
            setLoadedById((prev) => {
              if (prev[id]) {
                return prev;
              }
              return { ...prev, [id]: item };
            });
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }
          } finally {
            pendingRef.current.delete(id);
            activeRef.current -= 1;
            processQueue(searchId, signal);
          }
        }, wait);
      }
    },
    [],
  );

  const enqueueFetch = useCallback(
    (id: number, searchId: number, signal?: AbortSignal) => {
      if (pendingRef.current.has(id)) {
        return;
      }
      const cached = cacheRef.current.get(id);
      if (cached) {
        setLoadedById((prev) => {
          if (prev[id]) {
            return prev;
          }
          return { ...prev, [id]: cached };
        });
        return;
      }
      pendingRef.current.add(id);
      queueRef.current.push(id);
      processQueue(searchId, signal);
    },
    [processQueue],
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
    setObjectIDs([]);
    setLoadedById({});
    setSelected(null);
    setSelectedDetails(null);
    queueRef.current = [];
    pendingRef.current.clear();
    tileRefs.current.clear();

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
        const cachedItems: Record<number, MetObject> = {};
        const missing: number[] = [];
        ids.forEach((id) => {
        const cached = cacheRef.current.get(id);
        if (cached) {
          cachedItems[id] = cached;
        } else {
          missing.push(id);
        }
      });
        if (Object.keys(cachedItems).length > 0) {
          setLoadedById(cachedItems);
        }
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch(query);
  };

  const handleClear = () => {
    searchIdRef.current += 1;
    abortRef.current?.abort();
    setQuery('');
    setSubmittedQuery('');
    setObjectIDs([]);
    setLoadedById({});
    queueRef.current = [];
    pendingRef.current.clear();
    tileRefs.current.clear();
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

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const target = entry.target as HTMLElement;
          const id = Number(target.dataset.objectId);
          if (!Number.isNaN(id)) {
            enqueueFetch(id, searchIdRef.current, abortRef.current?.signal);
          }
          observerRef.current?.unobserve(target);
        });
      },
      { rootMargin: '400px' },
    );
    tileRefs.current.forEach((node) => observerRef.current?.observe(node));

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [enqueueFetch]);

  const registerTile = useCallback((node: HTMLButtonElement | null) => {
    if (!node) {
      return;
    }
    tileRefs.current.add(node);
    observerRef.current?.observe(node);
  }, []);

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

        {isSearching && !loadedCount && (
          <div className="empty-state">
            <h2>Searching…</h2>
            <p>Gathering artworks from the collection.</p>
          </div>
        )}

        {!isSearching &&
          submittedQuery &&
          !objectIDs.length &&
          !error && (
          <div className="empty-state">
            <h2>No results</h2>
            <p>Try a different search term or explore another keyword.</p>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {!!objectIDs.length && (
          <>
            <div className="mosaic-grid">
              {objectIDs.map((objectID) => {
                const item = loadedById[objectID];
                return (
                  <button
                    key={objectID}
                    className={`mosaic-card${item ? '' : ' is-loading'}`}
                    type="button"
                    onClick={() => item && handleSelect(item)}
                    ref={registerTile}
                    data-object-id={objectID}
                    disabled={!item}
                  >
                    {item ? (
                      <>
                        <img
                          src={item.primaryImageSmall || item.primaryImage}
                          alt={item.title}
                          loading="lazy"
                        />
                        <div className="mosaic-caption">
                          <span>{item.title}</span>
                          <small>{item.objectDate || item.objectName}</small>
                        </div>
                      </>
                    ) : (
                      <div className="mosaic-placeholder" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
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
