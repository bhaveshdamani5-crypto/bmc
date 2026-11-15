import { describe, expect, it } from 'vitest';
import { checkTransition, IllegalTransition } from '@/lib/orders/state-machine';

describe('order state machine', () => {
  it('allows the happy path', () => {
    const path = ['pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'served', 'completed'] as const;
    for (let i = 0; i < path.length - 1; i++) expect(checkTransition(path[i], path[i + 1])).toBe('ok');
  });
  it('treats a repeated event as an idempotent no-op', () => expect(checkTransition('paid', 'paid')).toBe('same'));
  it('blocks skipping steps and going backwards', () => {
    expect(() => checkTransition('pending_payment', 'preparing')).toThrow(IllegalTransition);
    expect(() => checkTransition('ready', 'paid')).toThrow(IllegalTransition);
  });
  it('only paid-and-later kitchen states can move to refund', () => {
    expect(checkTransition('paid', 'refund_pending')).toBe('ok');
    expect(() => checkTransition('pending_payment', 'refund_pending')).toThrow(IllegalTransition);
  });
  it('terminal states cannot move', () => expect(() => checkTransition('completed', 'paid')).toThrow(IllegalTransition));
});
