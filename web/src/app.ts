import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PhotoUpload } from './components/photo-upload/photo-upload';
import { VideoPreview } from './components/video-preview/video-preview';
import { VidooApi } from './services/vidoo-api.service';
import { VideoOrder } from './services/video-order.service';

@Component({
  selector: 'vidoo-app',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoUpload, VideoPreview],
  providers: [VideoOrder],
})
export class App {
  private readonly _vidooService = inject(VidooApi);
  protected readonly $checkingHiggsfield = signal(false);
  protected readonly $higgsfieldMessage = signal('');

  protected async checkHiggsfield() {
    this.$checkingHiggsfield.set(true);
    this.$higgsfieldMessage.set('Bağlantı kontrol ediliyor…');
    const messages = {
      connected: 'Higgsfield API anahtarı doğrulandı.',
      missing: 'Higgsfield API anahtarı sunucuda ayarlanmamış.',
      rejected: 'Higgsfield API erişimini reddetti.',
      unavailable: 'Higgsfield API bağlantısı şu anda doğrulanamadı.',
    };
    try {
      const { status } = await this._vidooService.checkHiggsfield();
      this.$higgsfieldMessage.set(messages[status]);
    } catch {
      this.$higgsfieldMessage.set(messages.unavailable);
    } finally {
      this.$checkingHiggsfield.set(false);
    }
  }
}
