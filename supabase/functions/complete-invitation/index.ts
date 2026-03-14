import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CompleteInvitationRequest {
  formId: string;
  token?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller?.id || !caller.email) {
      return json({ error: callerError?.message ?? "Unauthorized" }, 401);
    }

    const body = await req.json() as CompleteInvitationRequest;
    const formId = body.formId?.trim();
    const token = body.token?.trim() || null;

    if (!formId) {
      return json({ error: "formId is required" }, 400);
    }

    const normalizedEmail = caller.email.trim().toLowerCase();
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let completedCount = 0;

    if (token) {
      const { data: invitation, error: invitationError } = await adminClient
        .from("invitations")
        .select("id, email, form_id, status")
        .eq("token", token)
        .eq("form_id", formId)
        .maybeSingle();

      if (invitationError) {
        return json({ error: invitationError.message }, 500);
      }

      if (invitation) {
        if (invitation.email.trim().toLowerCase() !== normalizedEmail) {
          return json({ error: "Invitation does not belong to this user" }, 403);
        }

        if (invitation.status === "pending") {
          const { error: updateError } = await adminClient
            .from("invitations")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", invitation.id);

          if (updateError) {
            return json({ error: updateError.message }, 500);
          }

          completedCount += 1;
        }

        return json({ success: true, completedCount });
      }
    }

    const { data: matches, error: matchesError } = await adminClient
      .from("invitations")
      .select("id")
      .eq("form_id", formId)
      .eq("status", "pending")
      .ilike("email", normalizedEmail);

    if (matchesError) {
      return json({ error: matchesError.message }, 500);
    }

    if (!matches || matches.length === 0) {
      return json({ success: true, completedCount: 0 });
    }

    const { error: bulkUpdateError } = await adminClient
      .from("invitations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .in("id", matches.map((match) => match.id));

    if (bulkUpdateError) {
      return json({ error: bulkUpdateError.message }, 500);
    }

    return json({ success: true, completedCount: matches.length });
  } catch (err) {
    console.error("complete-invitation error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
