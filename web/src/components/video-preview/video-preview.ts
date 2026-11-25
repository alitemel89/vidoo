import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, viewChild } from '@angular/core';
import { VideoOrder } from '../../services/video-order.service';

@Component({
  selector: 'vidoo-video-preview',
  templateUrl: './video-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
})
export class VideoPreview implements OnInit {
  protected readonly video = inject(VideoOrder);
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');

  protected readonly view = computed(() => {
    const amount = this.video.order()?.amount ?? this.video.pricing()?.amount;
    return {
      preview: this.video.preview(),
      price: amount === undefined ? null : amount / 100,
      download: this.video.download(),
      canBuy: this.video.canBuy(),
      paymentMessage: this.video.paymentStatus(),
      retryPayment: this.video.retryPayment(),
    };
  });

  ngOnInit(): void {
    void this.video.restore();
  }

  reveal() {
    requestAnimationFrame(() => this.player()?.nativeElement.scrollIntoView({ block: 'nearest' }));
  }
}
