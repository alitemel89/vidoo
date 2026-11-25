import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, MIN_PHOTOS, PHOTO_MIME_TYPES } from '../constants/photo.constants';
import type { Photo } from '../models/photo';
import { VideoOrder } from './video-order.service';

@Injectable()
export class PhotoSelection {
  private readonly _videoOrderService = inject(VideoOrder);
  private readonly _$items = signal<readonly Photo[]>([]);
  public readonly $photos = this._$items.asReadonly();
  private readonly _$validationMessage = signal('');
  public readonly maxPhotos = MAX_PHOTOS;
  public readonly $creating = this._videoOrderService.$creating;
  public readonly $canCreate = computed(() =>
    !this.$creating() && !this._videoOrderService.$checkingOut() && this.$photos().length >= MIN_PHOTOS,
  );
  public readonly $uploadMessage = computed(() =>
    this._$validationMessage() || this._videoOrderService.$uploadMessage(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const photo of this.$photos()) URL.revokeObjectURL(photo.url);
    });
  }

  public async createPreview() {
    if (!this.$canCreate()) return false;
    this._$validationMessage.set('');
    return this._videoOrderService.create(this.$photos().map(photo => photo.file));
  }

  public addPhotos(files: readonly File[]) {
    if (this.$creating() || !files.length) return;
    this._$validationMessage.set('');
    if (this.$photos().length + files.length > MAX_PHOTOS) {
      this._$validationMessage.set(`En fazla ${MAX_PHOTOS} fotoğraf seçebilirsiniz.`);
      return;
    }
    if (files.some(file => !PHOTO_MIME_TYPES.has(file.type) || !file.size || file.size > MAX_PHOTO_BYTES)) {
      this._$validationMessage.set('Her fotoğraf JPG, PNG veya WebP biçiminde ve en fazla 8 MB olmalı.');
      return;
    }
    this._$items.update(photos => [...photos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }

  public move(from: number, to: number) {
    if (this.$creating() || !this.$photos()[from] || !this.$photos()[to]) return;
    const reordered = [...this.$photos()];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    this._$items.set(reordered);
    return to;
  }

  public remove(index: number) {
    const photo = this.$photos()[index];
    if (this.$creating() || !photo) return;
    URL.revokeObjectURL(photo.url);
    this._$items.update(photos => photos.filter((_, position) => position !== index));
    return Math.min(index, this.$photos().length - 1);
  }
}
