import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, token, formTitle } = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "email and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: profile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the invitation URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://gcu73-portal.vercel.app";
    const inviteLink = `${siteUrl}/invite?token=${token}`;

    // Send email using Resend (Supabase's built-in email or any SMTP)
    // Since Supabase doesn't expose a "send arbitrary email" API,
    // we use the admin API to invite the user which sends the invite template
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Use generateLink to create the invite without actually sending Supabase's default email
    // Then send our own branded email via the built-in SMTP
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${siteUrl}/invite?token=${token}`,
      },
    });

    if (linkError) {
      console.error("generateLink error:", linkError);
      // Non-fatal — continue to send our custom email
    }

    // Send the branded invitation email
    // Use Supabase's internal email sending via the Auth admin invite
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invited_via: "gcu73-portal",
        form_title: formTitle || "Group Life Insurance",
      },
    });

    if (inviteError) {
      // If user already exists, that's fine — we still want to notify them
      if (inviteError.message.includes("already been registered")) {
        // User exists — send them an OTP email instead so they get notified
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: inviteLink },
        });

        // We can't send a custom email without an SMTP provider,
        // but the generateLink created the user session link
        return new Response(
          JSON.stringify({
            success: true,
            message: "User already exists. Invite link generated.",
            inviteLink,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation email sent to ${email}`,
        inviteLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
