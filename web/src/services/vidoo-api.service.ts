import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import type { Pricing } from '../models/pricing';
import type { Order } from '../models/video-order';

function orderPath(id: string) {
  return `/api/jobs/${id}`;
}

@Injectable({ providedIn: 'root' })
export class VidooApi {
  private readonly _httpClient = inject(HttpClient);

  public readonly $pricing = httpResource<Pricing>(() => '/api/config');

  public create(files: readonly File[]) {
    const body = new FormData();
    for (const file of files) body.append('photos', file);
    return firstValueFrom(this._httpClient.post<Order & Pricing>('/api/jobs', body).pipe(
      map(({ id, amount, checkoutAvailable }) => ({
        order: { id, amount },
        pricing: { amount, checkoutAvailable },
      })),
    ));
  }

  public details(id: string) {
    return firstValueFrom(this._httpClient.get<Order>(`${orderPath(id)}/details`));
  }

  public preview(id: string) {
    return `${orderPath(id)}/preview`;
  }

  public checkout(id: string) {
    return firstValueFrom(this._httpClient.post<{ url: string; sessionId: string }>(
      `${orderPath(id)}/checkout`, null,
    ));
  }

  public payment(id: string, sessionId: string) {
    return firstValueFrom(this._httpClient.get<{ paid: boolean }>(`${orderPath(id)}/payment`, {
      params: new HttpParams().set('session', sessionId),
    }).pipe(map(response => response.paid)));
  }

  public download(id: string, sessionId: string) {
    return `${orderPath(id)}/download?${new URLSearchParams({ session: sessionId })}`;
  }
}
