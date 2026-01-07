import type { MetObject } from '../types/met';

type MosaicGridProps = {
  items: MetObject[];
  onSelect: (item: MetObject) => void;
};

export default function MosaicGrid({ items, onSelect }: MosaicGridProps) {
  return (
    <div className="mosaic-grid">
      {items.map((item) => (
        <button
          key={item.objectID}
          className="mosaic-card"
          type="button"
          onClick={() => onSelect(item)}
        >
          <img
            src={item.primaryImageSmall || item.primaryImage}
            alt={item.title}
          />
          <div className="mosaic-caption">
            <span>{item.title}</span>
            <small>{item.objectDate || item.objectName}</small>
          </div>
        </button>
      ))}
    </div>
  );
}
