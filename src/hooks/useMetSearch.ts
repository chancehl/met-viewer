import { useMemo, useRef, useState } from 'react';
import type { MetObject, MetSearchResponse } from '../types/met';

const PAGE_SIZE = 50;
const API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const MAX_CONCURRENT = 4;
const MIN_DELAY_MS = 60;

type TaskResult<R> =
  | { ok: true; value: R }
  | { ok: false; error: unknown };

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

const preloadImage = (url?: string) =>
  new Promise<void>((resolve) => {
    if (!url) {
      resolve();
      return;
    }
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  delayMs: number,
  worker: (item: T) => Promise<R>,
) => {
  const results = new Array<TaskResult<R>>(items.length);
  let index = 0;
  let active = 0;
  let lastStart = 0;

  return new Promise<TaskResult<R>[]>((resolve) => {
    const launch = () => {
      if (index >= items.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < limit && index < items.length) {
        const current = index;
        index += 1;
        active += 1;

        const startTask = async () => {
          const now = Date.now();
          const wait = Math.max(0, delayMs - (now - lastStart));
          lastStart = now + wait;
          if (wait) {
            await new Promise((timerResolve) => setTimeout(timerResolve, wait));
          }
          return worker(items[current]);
        };

        startTask()
          .then((result) => {
            results[current] = { ok: true, value: result };
          })
          .catch((error) => {
            results[current] = { ok: false, error };
          })
          .finally(() => {
            active -= 1;
            launch();
          });
      }
    };

    launch();
  });
};

export const MET_PAGE_SIZE = PAGE_SIZE;

export default function useMetSearch() {
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<MetObject[]>([]);
  const [selected, setSelected] = useState<MetObject | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MetObject | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const searchIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<number, MetObject>>(new Map());

  const loadedCount = useMemo(() => results.length, [results]);
  const activeDetails = selectedDetails || selected;

  const reset = () => {
    searchIdRef.current += 1;
    abortRef.current?.abort();
    setSubmittedQuery('');
    setResults([]);
    setIsSearching(false);
    setError('');
    setSelected(null);
    setSelectedDetails(null);
  };

  const closeDetails = () => {
    setSelected(null);
    setSelectedDetails(null);
  };

  const selectItem = (item: MetObject) => {
    setSelected(item);
    setSelectedDetails(null);
    setDetailsLoading(true);
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

  const search = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      reset();
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
    setResults([]);
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

      const objectResults = await runWithConcurrency(
        ids,
        MAX_CONCURRENT,
        MIN_DELAY_MS,
        async (id) => {
          const cached = cacheRef.current.get(id);
          if (cached) {
            return cached;
          }
          const item = await fetchObject(id, controller.signal);
          cacheRef.current.set(id, item);
          return item;
        },
      );

      if (searchIdRef.current !== searchId) {
        return;
      }

      const failures = objectResults.filter(
        (result) => result && !result.ok,
      ).length;
      const objects = objectResults.flatMap((result) =>
        result && result.ok ? [result.value] : [],
      );
      const withImages = objects.filter(
        (item) => item && (item.primaryImageSmall || item.primaryImage),
      );

      if (!withImages.length && failures > 0) {
        setError('All artwork requests failed. Please try again.');
        return;
      }

      await runWithConcurrency(
        withImages,
        MAX_CONCURRENT,
        MIN_DELAY_MS,
        (item) => preloadImage(item.primaryImageSmall || item.primaryImage),
      );

      if (searchIdRef.current !== searchId) {
        return;
      }

      setResults(withImages);
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

  return {
    activeDetails,
    closeDetails,
    detailsLoading,
    error,
    isSearching,
    loadedCount,
    reset,
    results,
    search,
    selectItem,
    selected,
    submittedQuery,
  };
}
