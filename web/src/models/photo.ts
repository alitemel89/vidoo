export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 5;

export interface Photo {
  readonly file: File;
  readonly url: string;
}
