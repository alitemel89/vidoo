import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { MAX_PHOTOS, Photo } from '../models/photo';

const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class PhotoSelection {
  private readonly _$items = signal<readonly Photo[]>([]);
  public readonly $photos = this._$items.asReadonly();
  private readonly _$validationMessage = signal('');
  public readonly $message = this._$validationMessage.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const photo of this.$photos()) URL.revokeObjectURL(photo.url);
    });
  }

  public clearMessage() {
    this._$validationMessage.set('');
  }

  public addPhotos(files: readonly File[]) {
    if (!files.length) return;
    this._$validationMessage.set('');
    if (this.$photos().length + files.length > MAX_PHOTOS) {
      this._$validationMessage.set(`En fazla ${MAX_PHOTOS} fotoğraf seçebilirsiniz.`);
      return;
    }
    if (files.some(file => !photoTypes.has(file.type) || !file.size || file.size > 8 * 1024 * 1024)) {
      this._$validationMessage.set('Her fotoğraf JPG, PNG veya WebP biçiminde ve en fazla 8 MB olmalı.');
      return;
    }
    this._$items.update(photos => [...photos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }

  public move(from: number, to: number) {
    if (!this.$photos()[from] || !this.$photos()[to]) return;
    const reordered = [...this.$photos()];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    this._$items.set(reordered);
    return to;
  }

  public remove(index: number) {
    const photo = this.$photos()[index];
    if (!photo) return;
    URL.revokeObjectURL(photo.url);
    this._$items.update(photos => photos.filter((_, position) => position !== index));
    return Math.min(index, this.$photos().length - 1);
  }
}
