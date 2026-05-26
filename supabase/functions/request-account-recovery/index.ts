import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile?.status === "deleted") {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "TrueSpend <support@truespend.org>",
          to: [profile.email],
          subject: "TrueSpend account recovery request received",
          html: `
            <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
              <h1 style="font-size:22px;margin:0 0 12px">Account recovery request received</h1>
              <p>Hi ${profile.first_name || "there"},</p>
              <p>Someone tried to sign in to a TrueSpend account that is currently marked as deleted.</p>
              <p>If this was you, reply to this email or contact support from the same email address and we will review whether the account can be restored before permanent deletion.</p>
              <p>If you did not request this, you can safely ignore this email.</p>
              <p style="color:#6b7280;font-size:13px;margin-top:24px">TrueSpend never asks for your password, verification codes, or payment details by email.</p>
            </div>
          `,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[request-account-recovery] error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
