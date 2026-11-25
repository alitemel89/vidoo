export interface Pricing {
  amount: number;
  checkoutAvailable: boolean;
}

export interface Order {
  id: string;
  amount: number;
  sessionId?: string;
}
