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
    const hasAdminAccess = (role?: string | null) =>
      role === "admin" || role === "super_admin";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://gcu73-portal.vercel.app";

    // Extract and verify JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing authorization" }, 401);

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "apikey": serviceRoleKey,
      },
    });

    if (!userRes.ok) return json({ error: "Unauthorized" }, 401);
    const caller = await userRes.json();
    if (!caller.id) return json({ error: "Invalid user" }, 401);

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!hasAdminAccess(profile?.role)) {
      return json({ error: "Admin access required" }, 403);
    }

    // Parse request
    const { email, token, formTitle } = await req.json();
    if (!email || !token) {
      return json({ error: "email and token are required" }, 400);
    }

    const inviteLink = `${siteUrl}/invite?token=${token}`;

    // Try inviting as new user first
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invited_via: "gcu73-portal",
        form_title: formTitle || "Group Life Insurance",
      },
    });

    if (!inviteError) {
      return json({
        success: true,
        message: `Invitation email sent to ${email}`,
        inviteLink,
        emailSent: true,
      });
    }

    // User already exists — send them a magic link email instead
    // This uses the magic_link template (branded "Your Login Code")
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: inviteLink,
      },
    });

    if (linkError) {
      console.error("generateLink error:", linkError.message);
      return json({
        success: true,
        message: `User exists but email could not be sent. Share the link.`,
        inviteLink,
        emailSent: false,
      });
    }

    // generateLink doesn't send an email — trigger OTP send via anon key
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!otpRes.ok) {
      const otpErr = await otpRes.json();
      console.error("OTP send error:", otpErr);
      return json({
        success: true,
        message: `User exists. Email rate limited. Share the link.`,
        inviteLink,
        emailSent: false,
      });
    }

    return json({
      success: true,
      message: `Login code sent to ${email}`,
      inviteLink,
      emailSent: true,
    });
  } catch (err) {
    console.error("Function error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
