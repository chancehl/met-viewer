type HeaderProps = {
  onClear: () => void;
};

export default function Header({ onClear }: HeaderProps) {
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">The Met Viewer</p>
        <h1>Search the collection</h1>
      </div>
      <button className="ghost-button" type="button" onClick={onClear}>
        Clear
      </button>
    </header>
  );
}
