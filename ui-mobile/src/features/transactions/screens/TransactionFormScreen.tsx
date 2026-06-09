/* region: archive — manual transaction form (removed from MVP)
 *
 * Manual transaction add/edit form has been removed from the MVP. Plaid-driven
 * sync is the sole producer of transaction rows. The component below is a
 * placeholder so legacy imports resolve; reaching this screen renders nothing.
 *
 * The original implementation included:
 *   - react-hook-form + zod validation against createTransactionSchema
 *   - useCreateTransaction / useUpdateTransaction mutations
 *   - getCurrentCoords() integration for optional location capture
 * See git history for the full implementation. To re-enable, restore the body
 * and re-archive this placeholder.
 *
 * endregion */

export function TransactionFormScreen() {
  return null;
}
