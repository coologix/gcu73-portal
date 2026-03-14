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
    const siteUrl = Deno.env.get("SITE_URL") || "https://gcu73-portal.vercel.app";

    const { email, token, formTitle, callerUserId } = await req.json();

    if (!email || !token || !callerUserId) {
      return new Response(
        JSON.stringify({ code: 400, message: "email, token, and callerUserId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use service role to verify the caller is an admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerUserId)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ code: 403, message: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inviteLink = `${siteUrl}/invite?token=${token}`;

    // Send invitation via Supabase Auth
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invited_via: "gcu73-portal",
        form_title: formTitle || "Group Life Insurance",
      },
    });

    if (inviteError) {
      if (inviteError.message.includes("already") || inviteError.message.includes("registered")) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "User already exists. Share the invite link.",
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
