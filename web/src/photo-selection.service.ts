import { DestroyRef, Injectable, inject, signal } from '@angular/core';

interface Photo {
  readonly file: File;
  readonly url: string;
}

const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class PhotoSelection {
  private readonly items = signal<readonly Photo[]>([]);
  readonly photos = this.items.asReadonly();
  readonly dragOver = signal(false);
  readonly locked = signal(false);
  readonly message = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const photo of this.photos()) URL.revokeObjectURL(photo.url);
    });
  }

  addPhotos(files: File[]) {
    if (this.locked() || !files.length) return;
    this.message.set('');
    if (this.photos().length + files.length > 5) {
      this.message.set('En fazla 5 fotoğraf seçebilirsiniz.');
      return;
    }
    if (files.some(file => !photoTypes.has(file.type) || !file.size || file.size > 8 * 1024 * 1024)) {
      this.message.set('Her fotoğraf JPG, PNG veya WebP biçiminde ve en fazla 8 MB olmalı.');
      return;
    }
    this.items.update(photos => [...photos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }

  move(from: number, to: number) {
    if (this.locked() || !this.photos()[from] || !this.photos()[to]) return;
    const reordered = [...this.photos()];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    this.items.set(reordered);
    return to;
  }

  remove(index: number) {
    const photo = this.photos()[index];
    if (this.locked() || !photo) return;
    URL.revokeObjectURL(photo.url);
    this.items.update(photos => photos.filter((_, position) => position !== index));
    return Math.min(index, this.photos().length - 1);
  }
}
