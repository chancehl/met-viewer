export {};

type SaveImageResult = {
  canceled: boolean;
  filePath?: string;
  error?: string;
};

declare global {
  interface Window {
    metViewer: {
      saveImage: (url: string, defaultName?: string) => Promise<SaveImageResult>;
    };
  }
}
