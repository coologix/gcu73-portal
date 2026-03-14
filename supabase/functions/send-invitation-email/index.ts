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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://gcu73-portal.vercel.app";

    // Get the JWT from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ code: 401, message: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the caller using their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      return new Response(
        JSON.stringify({ code: 401, message: "Invalid JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ code: 403, message: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse request body
    const { email, token, formTitle } = await req.json();
    if (!email || !token) {
      return new Response(
        JSON.stringify({ code: 400, message: "email and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inviteLink = `${siteUrl}/invite?token=${token}`;

    // Try to invite the user via Supabase Auth (sends the invite email template)
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invited_via: "gcu73-portal",
        form_title: formTitle || "Group Life Insurance",
      },
    });

    if (inviteError) {
      // User already exists — that's ok, just return success with the link
      if (inviteError.message.includes("already") || inviteError.message.includes("registered")) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `User already exists. Share the invite link.`,
            inviteLink,
            emailSent: false,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ code: 500, message: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation email sent to ${email}`,
        inviteLink,
        emailSent: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 500, message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
