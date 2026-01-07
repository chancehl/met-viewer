export type MetSearchResponse = {
  total: number;
  objectIDs?: number[];
};

export type MetObject = {
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
