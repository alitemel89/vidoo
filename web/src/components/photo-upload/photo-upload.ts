import { ChangeDetectionStrategy, Component, ElementRef, inject, output, signal, viewChild, viewChildren } from '@angular/core';
import { PhotoSelection } from '../../services/photo-selection.service';

@Component({
  selector: 'vidoo-photo-upload',
  templateUrl: './photo-upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PhotoSelection],
})
export class PhotoUpload {
  protected readonly selectionService = inject(PhotoSelection);
  private readonly _$dragging = signal(false);
  protected readonly $dragging = this._$dragging.asReadonly();
  private readonly _$fileInput = viewChild.required<ElementRef<HTMLInputElement>>('files');
  private readonly _$photoRows = viewChildren<ElementRef<HTMLLIElement>>('photoRow');

  public readonly previewCreated = output<void>();

  protected async createPreview() {
    if (await this.selectionService.createPreview()) this.previewCreated.emit();
  }

  protected choosePhotos(input: HTMLInputElement) {
    if (input.files) this.selectionService.addPhotos(Array.from(input.files));
    input.value = '';
  }

  protected handleDrag(event: DragEvent) {
    event.preventDefault();
    if (!this.selectionService.$creating()) this._$dragging.set(true);
  }

  protected handleDrop(event: DragEvent) {
    event.preventDefault();
    this._$dragging.set(false);
    if (event.dataTransfer) this.selectionService.addPhotos(Array.from(event.dataTransfer.files));
  }

  protected endDrag() {
    this._$dragging.set(false);
  }

  protected movePhoto(from: number, to: number) {
    const index = this.selectionService.move(from, to);
    if (index !== undefined) this._focusPhoto(index);
  }

  protected removePhoto(position: number) {
    const index = this.selectionService.remove(position);
    if (index !== undefined) this._focusPhoto(index);
  }

  private _focusPhoto(index: number) {
    requestAnimationFrame(() => {
      const button = this._$photoRows()[index]?.nativeElement.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (button ?? this._$fileInput().nativeElement).focus();
    });
  }
}
