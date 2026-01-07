import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import DetailsModal from './components/DetailsModal';
import EmptyState from './components/EmptyState';
import ErrorBanner from './components/ErrorBanner';
import Header from './components/Header';
import LoadingState from './components/LoadingState';
import MosaicGrid from './components/MosaicGrid';
import ResultsFooter from './components/ResultsFooter';
import SearchBar from './components/SearchBar';
import useMetSearch, { MET_PAGE_SIZE } from './hooks/useMetSearch';
import { buildDefaultFilename } from './lib/met';
import type { MetObject } from './types/met';

export default function App() {
  const [query, setQuery] = useState('');
  const {
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
    submittedQuery,
  } = useMetSearch();
  const [downloadStatus, setDownloadStatus] = useState('');

  const isEmptyState = useMemo(
    () => !isSearching && !loadedCount && !submittedQuery,
    [isSearching, loadedCount, submittedQuery],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    search(query);
  };

  const handleClear = () => {
    setQuery('');
    reset();
    setDownloadStatus('');
  };

  const handleCloseModal = () => {
    closeDetails();
    setDownloadStatus('');
  };

  const handleSelect = (item: MetObject) => {
    setDownloadStatus('');
    selectItem(item);
  };

  const handleDownload = async () => {
    if (!activeDetails) {
      return;
    }
    const url = activeDetails.primaryImage || activeDetails.primaryImageSmall;
    if (!url) {
      setDownloadStatus('No image available for download.');
      return;
    }
    setDownloadStatus('Saving...');
    try {
      const result = await window.metViewer.saveImage(
        url,
        buildDefaultFilename(activeDetails),
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

  return (
    <div className="app-shell">
      <Header onClear={handleClear} />

      <main className="content">
        {isEmptyState && (
          <EmptyState
            title="Search to get started"
            message="Discover highlights, hidden gems, and everything in-between."
          />
        )}

        {!isSearching &&
          submittedQuery &&
          !results.length &&
          !error && (
          <EmptyState
            title="No results"
            message="Try a different search term or explore another keyword."
          />
        )}

        {error && <ErrorBanner message={error} />}

        {isSearching && (
          <LoadingState message="Loading artworks and images…" />
        )}

        {!!results.length && !isSearching && (
          <>
            <MosaicGrid items={results} onSelect={handleSelect} />
            <ResultsFooter
              loadedCount={results.length}
              maxCount={MET_PAGE_SIZE}
            />
          </>
        )}
      </main>

      <SearchBar
        query={query}
        isSearching={isSearching}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
      />

      {activeDetails && (
        <DetailsModal
          item={activeDetails}
          isLoading={detailsLoading}
          downloadStatus={downloadStatus}
          onClose={handleCloseModal}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
