import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Order, Pricing, VidooApi, errorMessage } from './vidoo-api';

interface Photo {
  file: File;
  url: string;
}

const priceFormat = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' });
const storageKey = 'vidoo-order';
const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Component({ selector: 'vidoo-app', templateUrl: './app.html' })
export class App implements OnInit, OnDestroy {
  private readonly api = inject(VidooApi);
  private readonly config = signal<Pricing | null>(null);
  protected readonly order = signal<Order | null>(null);
  protected readonly photos = signal<readonly Photo[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly creating = signal(false);
  protected readonly checkingOut = signal(false);
  protected readonly checkingPayment = signal(false);
  protected readonly uploadMessage = signal('');
  protected readonly paymentMessage = signal('');
  protected readonly retryPayment = signal(false);
  protected readonly download = signal<string | null>(null);
  protected readonly price = computed(() => {
    const amount = this.order()?.amount ?? this.config()?.amount;
    return amount === undefined ? '—' : priceFormat.format(amount / 100);
  });
  protected readonly preview = computed(() => {
    const order = this.order();
    return order ? this.api.preview(order.id) : null;
  });
  protected readonly canCreate = computed(() =>
    !this.creating() && !this.checkingOut() && this.photos().length >= 3,
  );
  protected readonly canBuy = computed(() =>
    Boolean(this.order() && this.config()?.checkoutAvailable) &&
    !this.creating() && !this.checkingOut() && !this.checkingPayment(),
  );

  async ngOnInit() {
    try {
      this.config.set(await this.api.config());
    } catch {
      this.paymentMessage.set('Ödeme ayarları yüklenemedi.');
    }
    const params = new URLSearchParams(location.search);
    const cached = this.savedOrder();
    const id = params.get('job') ?? cached?.id;
    if (!id || !/^[a-f0-9]{48}$/.test(id)) return;
    try {
      const order = await this.api.details(id);
      if (this.order()) return;
      order.sessionId = params.get('session') ?? (cached?.id === id ? cached.sessionId : undefined);
      this.showOrder(order);
      if (params.has('cancelled')) {
        this.paymentMessage.set('Ödeme iptal edildi. Hazır olduğunuzda tekrar deneyebilirsiniz.');
      } else {
        await this.checkPayment();
      }
    } catch (error) {
      if (!this.order()) this.paymentMessage.set(errorMessage(error));
    }
  }

  ngOnDestroy() {
    for (const photo of this.photos()) URL.revokeObjectURL(photo.url);
  }

  protected choosePhotos(input: HTMLInputElement) {
    if (input.files) this.addPhotos(Array.from(input.files));
    input.value = '';
  }

  protected handleDrag(event: DragEvent) {
    event.preventDefault();
    if (!this.creating()) this.dragOver.set(true);
  }

  protected handleDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer) this.addPhotos(Array.from(event.dataTransfer.files));
  }

  private addPhotos(files: File[]) {
    if (this.creating() || !files.length) return;
    this.uploadMessage.set('');
    if (this.photos().length + files.length > 5) {
      this.uploadMessage.set('En fazla 5 fotoğraf seçebilirsiniz.');
      return;
    }
    if (files.some(file => !photoTypes.has(file.type) || !file.size || file.size > 8 * 1024 * 1024)) {
      this.uploadMessage.set('Her fotoğraf JPG, PNG veya WebP biçiminde ve en fazla 8 MB olmalı.');
      return;
    }
    this.photos.update(photos => [...photos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }

  protected move(from: number, to: number) {
    if (this.creating() || to < 0 || to >= this.photos().length) return;
    const reordered = [...this.photos()];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    this.photos.set(reordered);
    this.focusPhoto(to);
  }

  protected remove(index: number) {
    if (this.creating()) return;
    URL.revokeObjectURL(this.photos()[index].url);
    this.photos.update(photos => photos.filter((_, position) => position !== index));
    this.focusPhoto(Math.min(index, this.photos().length - 1));
  }

  private focusPhoto(index: number) {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`#photos li:nth-child(${index + 1}) button:not(:disabled)`);
      (target ?? document.querySelector<HTMLInputElement>('#files'))?.focus();
    });
  }

  protected async create() {
    if (!this.canCreate()) return;
    this.creating.set(true);
    this.uploadMessage.set('Fotoğraflar yükleniyor ve video hazırlanıyor…');
    try {
      const created = await this.api.create(this.photos().map(photo => photo.file));
      this.config.set(created);
      this.showOrder({ id: created.id, amount: created.amount });
      history.replaceState(null, '', `/?job=${created.id}`);
      this.uploadMessage.set('Önizleme hazır.');
      requestAnimationFrame(() => document.querySelector('#video')?.scrollIntoView({ block: 'nearest' }));
    } catch (error) {
      this.uploadMessage.set(errorMessage(error));
    } finally {
      this.creating.set(false);
    }
  }

  protected async checkout() {
    const order = this.order();
    if (!order || !this.canBuy()) return;
    this.checkingOut.set(true);
    this.paymentMessage.set('Stripe ödeme sayfası açılıyor…');
    try {
      const result = await this.api.checkout(order.id);
      this.remember({ ...order, sessionId: result.sessionId });
      location.assign(result.url);
    } catch (error) {
      this.paymentMessage.set(errorMessage(error));
      if (error instanceof HttpErrorResponse && error.status === 409) await this.checkPayment();
    } finally {
      this.checkingOut.set(false);
    }
  }

  protected async checkPayment() {
    const order = this.order();
    if (!order?.sessionId || this.checkingPayment()) return;
    this.checkingPayment.set(true);
    this.retryPayment.set(false);
    try {
      const result = await this.api.payment(order.id, order.sessionId);
      if (!result.paid || this.order() !== order) return;
      this.download.set(this.api.download(order.id, order.sessionId));
      this.paymentMessage.set('Ödeme onaylandı. Videoyu önizlemenin oluşturulduğu tarihten itibaren 7 gün içinde indirebilirsiniz.');
    } catch (error) {
      if (this.order() !== order) return;
      this.paymentMessage.set(errorMessage(error));
      this.retryPayment.set(!(error instanceof HttpErrorResponse) || ![402, 404].includes(error.status));
    } finally {
      this.checkingPayment.set(false);
    }
  }

  protected previewError() {
    if (!this.download()) this.paymentMessage.set('Önizleme açılamadı. Yeni bir video oluşturabilirsiniz.');
  }

  private showOrder(order: Order) {
    this.order.set(order);
    this.remember(order);
    this.download.set(null);
    this.retryPayment.set(false);
    this.paymentMessage.set(this.config()?.checkoutAvailable ? '' : 'Ödeme şu anda kullanılamıyor.');
  }

  private remember(order: Order) {
    try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  }

  private savedOrder(): Order | null {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  }
}
