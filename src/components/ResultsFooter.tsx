type ResultsFooterProps = {
  loadedCount: number;
  maxCount: number;
};

export default function ResultsFooter({
  loadedCount,
  maxCount,
}: ResultsFooterProps) {
  return (
    <div className="sentinel">
      Showing {loadedCount} of up to {maxCount} results.
    </div>
  );
}
