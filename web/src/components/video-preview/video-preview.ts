import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
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

  private readonly _$fullscreenMessage = signal('');
  protected readonly $fullscreenMessage = this._$fullscreenMessage.asReadonly();

  protected async openFullscreen(): Promise<void> {
    const video = this._$player()?.nativeElement as
      (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | undefined;
    if (!video) return;
    this._$fullscreenMessage.set('');
    try {
      if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else {
        await video.requestFullscreen();
      }
    } catch {
      this._$fullscreenMessage.set('Tam ekran açılamadı. Oynatıcının tam ekran düğmesini de deneyebilirsin.');
    }
  }

  public ngOnInit(): void {
    void this.videoOrderService.restore();
  }

  public reveal() {
    requestAnimationFrame(() => this._$player()?.nativeElement.scrollIntoView({ block: 'nearest' }));
  }
}
