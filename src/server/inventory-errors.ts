export type InventoryErrorCode = 'invalid_sale' | 'invalid_input' | 'not_found' | 'already_voided' | 'no_change' | 'conflict' | 'has_history';

/** Expected, user-fixable failures. `details` is for the admin only and never contains customer data. */
export class InventoryError extends Error {
  constructor(readonly code: InventoryErrorCode, readonly details: string[] = []) {
    super(`${code}${details.length ? `: ${details.join('; ')}` : ''}`);
  }
}
