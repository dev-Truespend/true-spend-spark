import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, getServiceClient, handleCors, jsonResponse, parseJson, requireUser, resolveMerchant, safeError } from "../_shared/source-truth.ts";

const schema = z.object({
  domain: z.string().trim().min(3).max(255),
  page_title: z.string().trim().max(200).optional(),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    await requireUser(req);
    const input = schema.parse(await parseJson(req));
    const result = await resolveMerchant(getServiceClient(), input.domain);
    return jsonResponse(req, result);
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
