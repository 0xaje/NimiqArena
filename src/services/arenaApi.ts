import type { PaymentIntent } from '../types/nimiq';

export interface AuthChallenge {
  challengeId: string;
  account: string;
  message: string;
  expiresAt: string;
}

export interface ArenaApi {
  createAuthChallenge(account: string): Promise<AuthChallenge>;
  createSession(input: { challengeId: string; account: string; message: string; publicKey: string; signature: string }): Promise<{ sessionToken: string }>;
  createPaymentIntent(input: { matchId: string; payer: string; idempotencyKey: string }): Promise<PaymentIntent>;
  submitPaymentHash(intentId: string, txHash: string): Promise<PaymentIntent>;
  getPaymentIntent(intentId: string): Promise<PaymentIntent>;
}

export class ArenaHttpApi implements ArenaApi {
  constructor(private readonly baseUrl: string) {
    if (!baseUrl) throw new Error('Arena API base URL is not configured.');
  }

  createAuthChallenge(account: string) {
    return this.request<AuthChallenge>('/v1/auth/challenges', { method: 'POST', body: { account } });
  }

  createSession(input: { challengeId: string; account: string; message: string; publicKey: string; signature: string }) {
    return this.request<{ sessionToken: string }>('/v1/auth/sessions', { method: 'POST', body: input });
  }

  createPaymentIntent(input: { matchId: string; payer: string; idempotencyKey: string }) {
    return this.request<PaymentIntent>('/v1/payment-intents', { method: 'POST', body: input, idempotencyKey: input.idempotencyKey });
  }

  submitPaymentHash(intentId: string, txHash: string) {
    return this.request<PaymentIntent>(`/v1/payment-intents/${encodeURIComponent(intentId)}/submit`, { method: 'POST', body: { txHash } });
  }

  getPaymentIntent(intentId: string) {
    return this.request<PaymentIntent>(`/v1/payment-intents/${encodeURIComponent(intentId)}`);
  }

  private async request<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `Arena API request failed with HTTP ${response.status}.`;
      throw new Error(message);
    }
    return payload as T;
  }
}

export const arenaApi = import.meta.env.VITE_ARENA_API_URL
  ? new ArenaHttpApi(import.meta.env.VITE_ARENA_API_URL)
  : null;
