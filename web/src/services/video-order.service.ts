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
  private readonly _$order = signal<Order>();
  private readonly _$updatedPricing = signal<Pricing>();
  public readonly $order = this._$order.asReadonly();
  public readonly $pricing = computed(() => this._$updatedPricing() ??
    (this.api.$pricing.hasValue() ? this.api.$pricing.value() : undefined));
  private readonly _$creating = signal(false);
  public readonly $creating = this._$creating.asReadonly();
  private readonly _$checkingOut = signal(false);
  public readonly $checkingOut = this._$checkingOut.asReadonly();
  private readonly _$checkingPayment = signal(false);
  private readonly _$uploadMessage = signal('');
  public readonly $uploadMessage = this._$uploadMessage.asReadonly();
  private readonly _$paymentMessage = signal('');
  private readonly _$retryPayment = signal(false);
  public readonly $retryPayment = this._$retryPayment.asReadonly();
  private readonly _$download = signal<string>();
  public readonly $download = this._$download.asReadonly();
  public readonly $preview = computed(() => {
    const order = this.$order();
    return order ? this.api.preview(order.id) : undefined;
  });
  public readonly $paymentStatus = computed(() => {
    const message = this._$paymentMessage();
    if (message) return message;
    if (this.api.$pricing.error() && !this.$pricing()) return 'Ödeme ayarları yüklenemedi.';
    return this.$order() && this.$pricing()?.checkoutAvailable === false
      ? 'Ödeme şu anda kullanılamıyor.'
      : '';
  });
  public readonly $canBuy = computed(() =>
    Boolean(this.$order() && this.$pricing()?.checkoutAvailable) &&
    !this.$creating() && !this.$checkingOut() && !this._$checkingPayment(),
  );

  public async restore() {
    const params = new URLSearchParams(location.search);
    const cached = this._savedOrder();
    const id = params.get('job') ?? cached?.id;
    if (!id || !/^[a-f0-9]{48}$/.test(id)) return;
    try {
      const order = await this.api.details(id);
      if (this.$order()) return;
      order.sessionId = params.get('session') ?? (cached?.id === id ? cached.sessionId : undefined);
      this._showOrder(order);
      if (params.has('cancelled')) {
        this._$paymentMessage.set('Ödeme iptal edildi. Hazır olduğunuzda tekrar deneyebilirsiniz.');
      } else {
        await this.checkPayment();
      }
    } catch (error) {
      if (!this.$order()) this._$paymentMessage.set(errorMessage(error));
    }
  }

  public async create(files: readonly File[]) {
    if (this.$creating() || this.$checkingOut() || files.length < MIN_PHOTOS || files.length > MAX_PHOTOS) return;
    this._$creating.set(true);
    this._$uploadMessage.set('Fotoğraflar yükleniyor ve video hazırlanıyor…');
    try {
      const { order, pricing } = await this.api.create(files);
      this._$updatedPricing.set(pricing);
      this._showOrder(order);
      history.replaceState(null, '', `/?job=${order.id}`);
      this._$uploadMessage.set('Önizleme hazır.');
      return true;
    } catch (error) {
      this._$uploadMessage.set(errorMessage(error));
    } finally {
      this._$creating.set(false);
    }
  }

  public async checkout() {
    const order = this.$order();
    if (!order || !this.$canBuy()) return;
    this._$checkingOut.set(true);
    this._$paymentMessage.set('Stripe ödeme sayfası açılıyor…');
    try {
      const result = await this.api.checkout(order.id);
      this._remember({ ...order, sessionId: result.sessionId });
      location.assign(result.url);
    } catch (error) {
      this._$paymentMessage.set(errorMessage(error));
      if (error instanceof HttpErrorResponse && error.status === 409) await this.checkPayment();
    } finally {
      this._$checkingOut.set(false);
    }
  }

  public async checkPayment() {
    const order = this.$order();
    if (!order?.sessionId || this._$checkingPayment()) return;
    this._$checkingPayment.set(true);
    this._$retryPayment.set(false);
    try {
      const paid = await this.api.payment(order.id, order.sessionId);
      if (!paid || this.$order() !== order) return;
      this._$download.set(this.api.download(order.id, order.sessionId));
      this._$paymentMessage.set('Ödeme onaylandı. Videoyu önizlemenin oluşturulduğu tarihten itibaren 7 gün içinde indirebilirsiniz.');
    } catch (error) {
      if (this.$order() !== order) return;
      this._$paymentMessage.set(errorMessage(error));
      this._$retryPayment.set(!(error instanceof HttpErrorResponse) || ![402, 404].includes(error.status));
    } finally {
      this._$checkingPayment.set(false);
    }
  }

  public previewError() {
    if (!this.$download()) this._$paymentMessage.set('Önizleme açılamadı. Yeni bir video oluşturabilirsiniz.');
  }

  private _showOrder(order: Order) {
    this._$order.set(order);
    this._remember(order);
    this._$download.set(undefined);
    this._$retryPayment.set(false);
    this._$paymentMessage.set('');
  }

  private _remember(order: Order) {
    try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  }

  private _savedOrder(): Order | null {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  }
}
