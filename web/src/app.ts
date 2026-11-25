import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PhotoUpload } from './components/photo-upload/photo-upload';
import { VideoPreview } from './components/video-preview/video-preview';
import { VideoOrder } from './services/video-order.service';

@Component({
  selector: 'vidoo-app',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoUpload, VideoPreview],
  providers: [VideoOrder],
})
export class App {}
