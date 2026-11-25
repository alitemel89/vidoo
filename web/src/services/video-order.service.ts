import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { MAX_PHOTOS, MIN_PHOTOS } from '../models/photo';
import { Order, Pricing } from '../models/video-order';
import { VidooApi } from './vidoo-api.service';

const storageKey = 'vidoo-order';

function errorMessage(error: unknown) {
  if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
    return error.error.error;
  }
  return 'Bir sorun oluştu. Tekrar deneyin.';
}

@Injectable()
export class VideoOrder {
  private readonly api = inject(VidooApi);
  private readonly currentOrder = signal<Order | null>(null);
  private readonly updatedPricing = signal<Pricing | null>(null);
  readonly order = this.currentOrder.asReadonly();
  readonly pricing = computed(() => this.updatedPricing() ??
    (this.api.pricing.hasValue() ? this.api.pricing.value() : null));
  private readonly creatingState = signal(false);
  readonly creating = this.creatingState.asReadonly();
  private readonly checkingOutState = signal(false);
  readonly checkingOut = this.checkingOutState.asReadonly();
  private readonly checkingPayment = signal(false);
  private readonly uploadMessageState = signal('');
  readonly uploadMessage = this.uploadMessageState.asReadonly();
  private readonly paymentMessage = signal('');
  private readonly retryPaymentState = signal(false);
  readonly retryPayment = this.retryPaymentState.asReadonly();
  private readonly downloadState = signal<string | null>(null);
  readonly download = this.downloadState.asReadonly();
  readonly preview = computed(() => {
    const order = this.order();
    return order ? this.api.preview(order.id) : null;
  });
  readonly paymentStatus = computed(() => {
    const message = this.paymentMessage();
    if (message) return message;
    if (this.api.pricing.error() && !this.pricing()) return 'Ödeme ayarları yüklenemedi.';
    return this.order() && this.pricing()?.checkoutAvailable === false
      ? 'Ödeme şu anda kullanılamıyor.'
      : '';
  });
  readonly canBuy = computed(() =>
    Boolean(this.order() && this.pricing()?.checkoutAvailable) &&
    !this.creating() && !this.checkingOut() && !this.checkingPayment(),
  );

  async restore() {
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

  async create(files: readonly File[]) {
    if (this.creating() || this.checkingOut() || files.length < MIN_PHOTOS || files.length > MAX_PHOTOS) return;
    this.creatingState.set(true);
    this.uploadMessageState.set('Fotoğraflar yükleniyor ve video hazırlanıyor…');
    try {
      const { order, pricing } = await this.api.create(files);
      this.updatedPricing.set(pricing);
      this.showOrder(order);
      history.replaceState(null, '', `/?job=${order.id}`);
      this.uploadMessageState.set('Önizleme hazır.');
      return true;
    } catch (error) {
      this.uploadMessageState.set(errorMessage(error));
    } finally {
      this.creatingState.set(false);
    }
  }

  async checkout() {
    const order = this.order();
    if (!order || !this.canBuy()) return;
    this.checkingOutState.set(true);
    this.paymentMessage.set('Stripe ödeme sayfası açılıyor…');
    try {
      const result = await this.api.checkout(order.id);
      this.remember({ ...order, sessionId: result.sessionId });
      location.assign(result.url);
    } catch (error) {
      this.paymentMessage.set(errorMessage(error));
      if (error instanceof HttpErrorResponse && error.status === 409) await this.checkPayment();
    } finally {
      this.checkingOutState.set(false);
    }
  }

  async checkPayment() {
    const order = this.order();
    if (!order?.sessionId || this.checkingPayment()) return;
    this.checkingPayment.set(true);
    this.retryPaymentState.set(false);
    try {
      const paid = await this.api.payment(order.id, order.sessionId);
      if (!paid || this.order() !== order) return;
      this.downloadState.set(this.api.download(order.id, order.sessionId));
      this.paymentMessage.set('Ödeme onaylandı. Videoyu önizlemenin oluşturulduğu tarihten itibaren 7 gün içinde indirebilirsiniz.');
    } catch (error) {
      if (this.order() !== order) return;
      this.paymentMessage.set(errorMessage(error));
      this.retryPaymentState.set(!(error instanceof HttpErrorResponse) || ![402, 404].includes(error.status));
    } finally {
      this.checkingPayment.set(false);
    }
  }

  previewError() {
    if (!this.download()) this.paymentMessage.set('Önizleme açılamadı. Yeni bir video oluşturabilirsiniz.');
  }

  private showOrder(order: Order) {
    this.currentOrder.set(order);
    this.remember(order);
    this.downloadState.set(null);
    this.retryPaymentState.set(false);
    this.paymentMessage.set('');
  }

  private remember(order: Order) {
    try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  }

  private savedOrder(): Order | null {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  }
}
