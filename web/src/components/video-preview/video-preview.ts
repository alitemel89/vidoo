import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, viewChild } from '@angular/core';
import { VideoOrder } from '../../services/video-order.service';

@Component({
  selector: 'vidoo-video-preview',
  templateUrl: './video-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
})
export class VideoPreview implements OnInit {
  protected readonly videoOrderService = inject(VideoOrder);
  private readonly _$player = viewChild<ElementRef<HTMLVideoElement>>('player');

  public ngOnInit(): void {
    void this.videoOrderService.restore();
  }

  public reveal() {
    requestAnimationFrame(() => this._$player()?.nativeElement.scrollIntoView({ block: 'nearest' }));
  }
}
