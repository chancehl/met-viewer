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

const LOADING_FACTS = [
  'The Met holds more than two million works of art across 5,000 years.',
  'The museum opened in 1872 with just a few hundred objects.',
  'Many Met galleries rotate objects to protect light-sensitive works.',
  'The Met Cloisters is a separate site dedicated to medieval art and architecture.',
  'Public-domain images from the Met can be downloaded in high resolution.',
  'The Temple of Dendur was dismantled in Egypt and reassembled at the Met.',
  'The American Wing at the Met opened in 1924.',
  'Some paintings at the Met have frames made by the original artists.',
  'The Met hosts a rooftop garden with seasonal art installations.',
  'Arms and armor galleries include suits crafted for both war and ceremony.',
  'The Met is one of the largest art museums by gallery space.',
  'Gallery lighting is tuned to preserve pigments and textiles.',
  'The Met has a dedicated conservation department for paper, textiles, and more.',
  'Many ancient sculptures at the Met still show traces of original paint.',
  'The Met collection includes musical instruments from around the world.',
];

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
          <LoadingState
            message="Loading artwork and curating highlights..."
            facts={LOADING_FACTS}
          />
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
