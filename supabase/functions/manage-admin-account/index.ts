import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ManageAdminRequest =
  | {
      action: "invite_admin";
      email: string;
      fullName?: string | null;
    }
  | {
      action: "set_role";
      userId: string;
      role: "admin" | "super_admin" | "user";
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://gcu73-portal.vercel.app";

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

    if (callerError || !caller?.id) {
      return json({ error: callerError?.message ?? "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!hasAdminAccess(callerProfile?.role)) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json() as ManageAdminRequest;

    if (body.action === "invite_admin") {
      const normalizedEmail = body.email.trim().toLowerCase();
      const normalizedName = body.fullName?.trim() || null;

      if (!normalizedEmail) {
        return json({ error: "Email is required" }, 400);
      }

      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingProfileError) {
        return json({ error: existingProfileError.message }, 500);
      }

      if (existingProfile) {
        const { error: updateExistingError } = await adminClient
          .from("profiles")
          .update({
            role: "admin",
            full_name: normalizedName ?? existingProfile.full_name,
          })
          .eq("id", existingProfile.id);

        if (updateExistingError) {
          return json({ error: updateExistingError.message }, 500);
        }

        const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
          method: "POST",
          headers: {
            "apikey": anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: normalizedEmail }),
        });

        const message = otpRes.ok
          ? hasAdminAccess(existingProfile.role)
            ? `Admin access already exists for ${normalizedEmail}. A login code was sent.`
            : `Admin access granted to ${normalizedEmail}. A login code was sent.`
          : hasAdminAccess(existingProfile.role)
            ? `Admin access already exists for ${normalizedEmail}.`
            : `Admin access granted to ${normalizedEmail}.`;

        return json({
          success: true,
          message,
          mode: hasAdminAccess(existingProfile.role) ? "existing_admin" : "promoted_existing_user",
        });
      }

      const { data: inviteData, error: inviteError } = await adminClient.auth.admin
        .inviteUserByEmail(normalizedEmail, {
          redirectTo: `${siteUrl}/login`,
          data: normalizedName ? { full_name: normalizedName } : undefined,
        });

      if (inviteError) {
        return json({ error: inviteError.message }, 400);
      }

      const invitedUserId = inviteData.user?.id;
      if (invitedUserId) {
        const { error: upsertError } = await adminClient
          .from("profiles")
          .upsert({
            id: invitedUserId,
            email: normalizedEmail,
            full_name: normalizedName,
            role: "admin",
          });

        if (upsertError) {
          return json({ error: upsertError.message }, 500);
        }
      }

      return json({
        success: true,
        message: `Admin invitation sent to ${normalizedEmail}`,
        mode: "invited_new_admin",
      });
    }

    if (body.action === "set_role") {
      if (!body.userId) {
        return json({ error: "userId is required" }, 400);
      }

      if (body.role !== "admin" && body.role !== "super_admin" && body.role !== "user") {
        return json({ error: "role must be admin, super_admin, or user" }, 400);
      }

      if (body.userId === caller.id && !hasAdminAccess(body.role)) {
        return json({ error: "You cannot remove your own admin access" }, 400);
      }

      const { data: targetProfile, error: targetProfileError } = await adminClient
        .from("profiles")
        .select("id, email, role")
        .eq("id", body.userId)
        .single();

      if (targetProfileError || !targetProfile) {
        return json({ error: targetProfileError?.message ?? "User not found" }, 404);
      }

      const { error: roleUpdateError } = await adminClient
        .from("profiles")
        .update({ role: body.role })
        .eq("id", body.userId);

      if (roleUpdateError) {
        return json({ error: roleUpdateError.message }, 500);
      }

      return json({
        success: true,
        message: hasAdminAccess(body.role)
          ? `${targetProfile.email} now has admin access`
          : `${targetProfile.email} no longer has admin access`,
      });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (err) {
    console.error("manage-admin-account error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
