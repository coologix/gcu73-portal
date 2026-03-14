import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const siteUrl = Deno.env.get("SITE_URL") || "https://gcu73-portal.vercel.app";

    // Extract JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing authorization" }, 401);

    // Verify JWT by calling the Supabase Auth API directly
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "apikey": serviceRoleKey,
      },
    });

    if (!userRes.ok) {
      const errBody = await userRes.text();
      console.error("Auth verify failed:", userRes.status, errBody);
      return json({ error: "Unauthorized" }, 401);
    }

    const caller = await userRes.json();
    const callerId = caller.id;

    if (!callerId) return json({ error: "Invalid user" }, 401);

    // Check admin role with service role client (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profile?.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    // Parse request
    const { email, token, formTitle } = await req.json();
    if (!email || !token) {
      return json({ error: "email and token are required" }, 400);
    }

    const inviteLink = `${siteUrl}/invite?token=${token}`;

    // Send invitation email
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invited_via: "gcu73-portal",
        form_title: formTitle || "Group Life Insurance",
      },
    });

    if (inviteError) {
      if (inviteError.message.includes("already") || inviteError.message.includes("registered")) {
        return json({
          success: true,
          message: "User already exists. Share the invite link.",
          inviteLink,
          emailSent: false,
        });
      }
      console.error("Invite error:", inviteError.message);
      return json({ error: inviteError.message }, 500);
    }

    return json({
      success: true,
      message: `Invitation email sent to ${email}`,
      inviteLink,
      emailSent: true,
    });
  } catch (err) {
    console.error("Function error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
