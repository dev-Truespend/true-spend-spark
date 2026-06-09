/* region: archive — manual transaction add (removed from MVP)
 *
 * The /transactions/new route is archived. A null component is exported so the
 * Expo Router file-based routing tree still resolves at build time (no 404 on
 * legacy deep links), but the screen is empty if reached.
 *
 * import { TransactionFormScreen } from "@/features/transactions/screens/TransactionFormScreen";
 * export default TransactionFormScreen;
 *
 * endregion */

export default function ArchivedTransactionsNewRoute() {
  return null;
}
