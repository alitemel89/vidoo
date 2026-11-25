import { HttpClient, HttpErrorResponse, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';

export interface Pricing {
  amount: number;
  checkoutAvailable: boolean;
}

export interface Order {
  id: string;
  amount: number;
  sessionId?: string;
}

function orderPath(id: string) {
  return `/api/jobs/${id}`;
}

export function errorMessage(error: unknown) {
  if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
    return error.error.error;
  }
  return 'Bir sorun oluştu. Tekrar deneyin.';
}

@Injectable({ providedIn: 'root' })
export class VidooApi {
  private readonly http = inject(HttpClient);

  readonly pricing = httpResource<Pricing>(() => '/api/config');

  create(files: readonly File[]) {
    const body = new FormData();
    for (const file of files) body.append('photos', file);
    return firstValueFrom(this.http.post<Order & Pricing>('/api/jobs', body).pipe(
      map(({ id, amount, checkoutAvailable }) => ({
        order: { id, amount },
        pricing: { amount, checkoutAvailable },
      })),
    ));
  }

  details(id: string) {
    return firstValueFrom(this.http.get<Order>(`${orderPath(id)}/details`));
  }

  preview(id: string) {
    return `${orderPath(id)}/preview`;
  }

  checkout(id: string) {
    return firstValueFrom(this.http.post<{ url: string; sessionId: string }>(
      `${orderPath(id)}/checkout`, null,
    ));
  }

  payment(id: string, sessionId: string) {
    return firstValueFrom(this.http.get<{ paid: boolean }>(`${orderPath(id)}/payment`, {
      params: new HttpParams().set('session', sessionId),
    }).pipe(map(response => response.paid)));
  }

  download(id: string, sessionId: string) {
    return `${orderPath(id)}/download?${new URLSearchParams({ session: sessionId })}`;
  }
}
