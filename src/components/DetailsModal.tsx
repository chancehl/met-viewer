import type { MetObject } from '../types/met';
import { formatArtist } from '../lib/met';

type DetailsModalProps = {
  item: MetObject;
  isLoading: boolean;
  downloadStatus: string;
  onClose: () => void;
  onDownload: () => void;
};

export default function DetailsModal({
  item,
  isLoading,
  downloadStatus,
  onClose,
  onDownload,
}: DetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="close-button" onClick={onClose}>
          Close
        </button>
        {isLoading && <p className="loading">Loading details…</p>}
        <div className="modal-body">
          <div className="modal-image">
            <img
              src={item.primaryImage || item.primaryImageSmall}
              alt={item.title}
            />
          </div>
          <div className="modal-info">
            <h2>{item.title}</h2>
            <p className="artist">{formatArtist(item)}</p>
            <div className="meta-grid">
              <div>
                <span>Medium</span>
                <strong>{item.medium || '—'}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{item.objectDate || '—'}</strong>
              </div>
              <div>
                <span>Dimensions</span>
                <strong>{item.dimensions || '—'}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{item.department || '—'}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{item.repository || '—'}</strong>
              </div>
              <div>
                <span>Credit</span>
                <strong>{item.creditLine || '—'}</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="primary-button"
            onClick={onDownload}
            disabled={!item.primaryImage}
          >
            Download
          </button>
          {downloadStatus && (
            <span className="download-status">{downloadStatus}</span>
          )}
        </div>
      </div>
    </div>
  );
}
