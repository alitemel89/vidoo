import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild, viewChildren } from '@angular/core';
import { MAX_PHOTOS, MIN_PHOTOS } from '../../models/photo';
import { PhotoSelection } from '../../services/photo-selection.service';
import { VideoOrder } from '../../services/video-order.service';

@Component({
  selector: 'vidoo-photo-upload',
  templateUrl: './photo-upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PhotoSelection],
})
export class PhotoUpload {
  private readonly selection = inject(PhotoSelection);
  private readonly video = inject(VideoOrder);
  private readonly _$dragging = signal(false);
  private readonly _$fileInput = viewChild.required<ElementRef<HTMLInputElement>>('files');
  private readonly _$photoRows = viewChildren<ElementRef<HTMLLIElement>>('photoRow');

  public readonly previewCreated = output<void>();

  protected readonly $view = computed(() => {
    const photos = this.selection.$photos();
    const creating = this.video.$creating();
    return {
      photos,
      creating,
      dragging: this._$dragging(),
      maxPhotos: MAX_PHOTOS,
      canCreate: !creating && !this.video.$checkingOut() && photos.length >= MIN_PHOTOS,
      uploadMessage: this.selection.$message() || this.video.$uploadMessage(),
    };
  });

  protected async createPreview() {
    if (!this.$view().canCreate) return;
    this.selection.clearMessage();
    const created = await this.video.create(this.selection.$photos().map(photo => photo.file));
    if (created) this.previewCreated.emit();
  }

  protected choosePhotos(input: HTMLInputElement) {
    if (!this.video.$creating() && input.files) this.selection.addPhotos(Array.from(input.files));
    input.value = '';
  }

  protected handleDrag(event: DragEvent) {
    event.preventDefault();
    if (!this.video.$creating()) this._$dragging.set(true);
  }

  protected handleDrop(event: DragEvent) {
    event.preventDefault();
    this._$dragging.set(false);
    if (!this.video.$creating() && event.dataTransfer) this.selection.addPhotos(Array.from(event.dataTransfer.files));
  }

  protected endDrag() {
    this._$dragging.set(false);
  }

  protected movePhoto(from: number, to: number) {
    if (this.video.$creating()) return;
    const index = this.selection.move(from, to);
    if (index !== undefined) this._focusPhoto(index);
  }

  protected removePhoto(position: number) {
    if (this.video.$creating()) return;
    const index = this.selection.remove(position);
    if (index !== undefined) this._focusPhoto(index);
  }

  private _focusPhoto(index: number) {
    requestAnimationFrame(() => {
      const button = this._$photoRows()[index]?.nativeElement.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (button ?? this._$fileInput().nativeElement).focus();
    });
  }
}
