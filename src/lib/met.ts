import type { MetObject } from '../types/met';

export const formatArtist = (object: MetObject) => {
  if (object.artistDisplayName && object.artistDisplayBio) {
    return `${object.artistDisplayName} — ${object.artistDisplayBio}`;
  }
  return object.artistDisplayName || object.culture || 'Unknown';
};

export const buildDefaultFilename = (object: MetObject) => {
  const safeTitle = object.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return safeTitle || `met-${object.objectID}`;
};
