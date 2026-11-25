import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { MAX_PHOTOS, Photo } from '../models/photo';

const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class PhotoSelection {
  private readonly items = signal<readonly Photo[]>([]);
  readonly photos = this.items.asReadonly();
  private readonly validationMessage = signal('');
  readonly message = this.validationMessage.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const photo of this.photos()) URL.revokeObjectURL(photo.url);
    });
  }

  clearMessage() {
    this.validationMessage.set('');
  }

  addPhotos(files: readonly File[]) {
    if (!files.length) return;
    this.validationMessage.set('');
    if (this.photos().length + files.length > MAX_PHOTOS) {
      this.validationMessage.set(`En fazla ${MAX_PHOTOS} fotoğraf seçebilirsiniz.`);
      return;
    }
    if (files.some(file => !photoTypes.has(file.type) || !file.size || file.size > 8 * 1024 * 1024)) {
      this.validationMessage.set('Her fotoğraf JPG, PNG veya WebP biçiminde ve en fazla 8 MB olmalı.');
      return;
    }
    this.items.update(photos => [...photos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }

  move(from: number, to: number) {
    if (!this.photos()[from] || !this.photos()[to]) return;
    const reordered = [...this.photos()];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    this.items.set(reordered);
    return to;
  }

  remove(index: number) {
    const photo = this.photos()[index];
    if (!photo) return;
    URL.revokeObjectURL(photo.url);
    this.items.update(photos => photos.filter((_, position) => position !== index));
    return Math.min(index, this.photos().length - 1);
  }
}
