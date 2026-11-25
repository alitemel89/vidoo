import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { PhotoSelection } from './photo-selection.service';
import { VideoOrder } from './video-order.service';

@Component({
  selector: 'vidoo-app',
  templateUrl: './app.html',
  imports: [CurrencyPipe],
  providers: [PhotoSelection, VideoOrder],
})
export class App implements OnInit {
  protected readonly selection = inject(PhotoSelection);
  protected readonly video = inject(VideoOrder);

  protected readonly view = computed(() => {
    const photos = this.selection.photos();
    const amount = this.video.order()?.amount ?? this.video.pricing()?.amount;
    const creating = this.video.creating();
    return {
      photos,
      dragging: this.selection.dragOver(),
      creating,
      canCreate: !creating && !this.video.checkingOut() && photos.length >= 3,
      uploadMessage: this.selection.message() || this.video.uploadMessage(),
      preview: this.video.preview(),
      price: amount === undefined ? null : amount / 100,
      download: this.video.download(),
      canBuy: this.video.canBuy(),
      paymentMessage: this.video.paymentStatus(),
      retryPayment: this.video.retryPayment(),
    };
  });

  ngOnInit() {
    return this.video.restore();
  }

  protected async createPreview() {
    if (!this.view().canCreate) return;
    this.selection.message.set('');
    this.selection.locked.set(true);
    try {
      const created = await this.video.create(this.selection.photos().map(photo => photo.file));
      if (created) {
        requestAnimationFrame(() => document.querySelector('#video')?.scrollIntoView({ block: 'nearest' }));
      }
    } finally {
      this.selection.locked.set(false);
    }
  }

  protected choosePhotos(input: HTMLInputElement) {
    if (input.files) this.selection.addPhotos(Array.from(input.files));
    input.value = '';
  }

  protected handleDrag(event: DragEvent) {
    event.preventDefault();
    if (!this.selection.locked()) this.selection.dragOver.set(true);
  }

  protected handleDrop(event: DragEvent) {
    event.preventDefault();
    this.selection.dragOver.set(false);
    if (event.dataTransfer) this.selection.addPhotos(Array.from(event.dataTransfer.files));
  }

  protected endDrag() {
    this.selection.dragOver.set(false);
  }

  protected movePhoto(from: number, to: number) {
    const index = this.selection.move(from, to);
    if (index !== undefined) this.focusPhoto(index);
  }

  protected removePhoto(position: number) {
    const index = this.selection.remove(position);
    if (index !== undefined) this.focusPhoto(index);
  }

  private focusPhoto(index: number) {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`#photos li:nth-child(${index + 1}) button:not(:disabled)`);
      (target ?? document.querySelector<HTMLInputElement>('#files'))?.focus();
    });
  }
}
