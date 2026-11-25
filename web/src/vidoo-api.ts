import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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

  config() {
    return firstValueFrom(this.http.get<Pricing>('/api/config'));
  }

  create(files: readonly File[]) {
    const body = new FormData();
    for (const file of files) body.append('photos', file);
    return firstValueFrom(this.http.post<Order & Pricing>('/api/jobs', body));
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
    }));
  }

  download(id: string, sessionId: string) {
    return `${orderPath(id)}/download?${new URLSearchParams({ session: sessionId })}`;
  }
}
