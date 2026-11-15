export type OrderStatus =
  | 'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready' | 'served'
  | 'completed' | 'cancelled' | 'expired' | 'refund_pending' | 'refunded';

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'expired', 'cancelled'],
  paid: ['accepted', 'refund_pending'],
  accepted: ['preparing', 'refund_pending'],
  preparing: ['ready', 'refund_pending'],
  ready: ['served'],
  served: ['completed'],
  refund_pending: ['refunded'],
  completed: [], cancelled: [], expired: [], refunded: [],
};

export class IllegalTransition extends Error {}

/** 'same' means a repeated event (idempotent no-op); 'ok' means apply it; otherwise throws. */
export function checkTransition(from: OrderStatus, to: OrderStatus): 'ok' | 'same' {
  if (from === to) return 'same';
  if (!ALLOWED[from].includes(to)) throw new IllegalTransition(`${from} -> ${to} is not allowed`);
  return 'ok';
}
