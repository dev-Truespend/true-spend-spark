import { z } from "zod";

export const exchangePlaidTokenSchema = z.object({
  publicToken: z.string().trim().min(1)
});
export type ExchangePlaidTokenInput = z.infer<typeof exchangePlaidTokenSchema>;

export const syncConnectionSchema = z.object({
  connectionId: z.number().int().positive()
});
export type SyncConnectionInput = z.infer<typeof syncConnectionSchema>;

export const reconnectConnectionSchema = z.object({
  connectionId: z.number().int().positive()
});
export type ReconnectConnectionInput = z.infer<typeof reconnectConnectionSchema>;

export const disconnectConnectionSchema = z.object({
  connectionId: z.number().int().positive()
});
export type DisconnectConnectionInput = z.infer<typeof disconnectConnectionSchema>;

export const syncPlaidTransactionsSchema = z.object({
  connectionId: z.number().int().positive().optional(),
  force: z.boolean().optional()
});
export type SyncPlaidTransactionsInput = z.infer<typeof syncPlaidTransactionsSchema>;
