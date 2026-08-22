import { storage } from 'wxt/utils/storage';

export interface ScrapedImage {
  src: string;
  originalName: string;
  ext: string;
  width: number;
  height: number;
  format?: string;
  alt?: string;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export type BatchDownloadMode = 'zip' | 'individual';
export type HoverKeyModifier = 'none' | 'alt' | 'ctrl';

export const settings = {
  filenameTemplate: storage.defineItem<string>('local:filenameTemplate', {
    fallback: '${domain}_${timestamp}_${index}.${ext}',
  }),
  hoverOverlayEnabled: storage.defineItem<boolean>('local:hoverOverlayEnabled', {
    fallback: true,
  }),
  batchSubfolder: storage.defineItem<boolean>('local:batchSubfolder', {
    fallback: true,
  }),
  minHoverSize: storage.defineItem<number>('local:minHoverSize', {
    fallback: 150,
  }),
  batchDownloadMode: storage.defineItem<BatchDownloadMode>('local:batchDownloadMode', {
    fallback: 'zip',
  }),
  hoverKeyModifier: storage.defineItem<HoverKeyModifier>('local:hoverKeyModifier', {
    fallback: 'none',
  }),
};
