import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://naappe.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
const roles = ["admin","supervisor","call_agent","field_agent","election_operator","viewer"];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sign in is required." }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const callerClient = createClient(url, publishable, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: "Invalid sign-in session." }, 401);

  const admin = createClient(url, serviceRole);
  const { data: callerRole } = await admin.from("user_roles").select("role,active").eq("user_id", user.id).maybeSingle();
  if (!callerRole?.active || callerRole.role !== "admin") return json({ error: "Admin access is required." }, 403);

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "admin_status") return json({ is_admin: true });
    if (action === "activity_summary") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const activeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: events, error } = await admin.from("user_activity").select("user_id,route,visited_at,event_type,device,browser,operating_system,timezone,latitude,longitude,location_accuracy").gte("visited_at", since).order("visited_at", { ascending: false }).limit(10000);
      if (error) throw error;
      const { data: usersResponse, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      const names = new Map(usersResponse.users.map(item => [item.id, item.user_metadata?.login_name || item.user_metadata?.display_name || item.email || "User"]));
      const latest = new Map<string,{user_id:string;route:string;visited_at:string}>();
      const pages = new Map<string,number>();
      for (const event of events || []) {
        if (!latest.has(event.user_id)) latest.set(event.user_id, event);
        pages.set(event.route, (pages.get(event.route) || 0) + 1);
      }
      const details = (item: typeof events extends never ? never : any) => ({ name: names.get(item.user_id) || "User", route: item.route, visited_at: item.visited_at, event_type: item.event_type || "page_view", device: item.device || null, browser: item.browser || null, operating_system: item.operating_system || null, timezone: item.timezone || null, latitude: item.latitude ?? null, longitude: item.longitude ?? null, location_accuracy: item.location_accuracy ?? null });
      const active = [...latest.values()].filter(item => item.visited_at >= activeSince).map(details);
      return json({ active, latest: [...latest.values()].slice(0,20).map(details), pages: [...pages.entries()].map(([route,views]) => ({ route, views })).sort((a,b) => b.views-a.views).slice(0,8), period: "Last 7 days" });
    }
    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const ids = data.users.map((item) => item.id);
      const { data: roleRows, error: roleError } = ids.length
        ? await admin.from("user_roles").select("user_id,role,display_name,active").in("user_id", ids)
        : { data: [], error: null };
      if (roleError) throw roleError;
      const roleMap = new Map((roleRows || []).map((item) => [item.user_id, item]));
      return json({ users: data.users.map((item) => {
        const role = roleMap.get(item.id);
        return { id: item.id, email: item.email || "", username: item.user_metadata?.login_name || "", name: role?.display_name || item.user_metadata?.display_name || "", role: role?.role || "viewer", active: role?.active ?? true, created_at: item.created_at, last_sign_in_at: item.last_sign_in_at };
      }) });
    }

    if (action === "create") {
      const username = String(body.username || "").trim().toLowerCase();
      const email = username ? `${username}@users.voteoperations.app` : "";
      const password = String(body.password || "");
      const role = String(body.role || "viewer");
      const name = String(body.name || "").trim().slice(0, 100);
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) return json({ error: "Username must use 3–32 letters, numbers, dots, dashes, or underscores." }, 400);
      if (password.length < 8) return json({ error: "Password must contain at least 8 characters." }, 400);
      if (!roles.includes(role)) return json({ error: "Choose a valid role." }, 400);
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role }, user_metadata: { display_name: name, login_name: username } });
      if (error || !data.user) throw error || new Error("User creation failed.");
      const { error: roleError } = await admin.from("user_roles").insert({ user_id: data.user.id, role, display_name: name || null, active: true });
      if (roleError) { await admin.auth.admin.deleteUser(data.user.id); throw roleError; }
      return json({ user: { id: data.user.id, username, name, role, active: true } }, 201);
    }

    const targetId = String(body.user_id || "");
    if (!targetId) return json({ error: "User is required." }, 400);
    if (targetId === user.id && (action === "set_active" || action === "set_role" || action === "delete")) return json({ error: "You cannot disable, change, or delete your own account." }, 400);

    if (action === "delete") {
      const { data: activeAdmins, error: adminListError } = await admin.from("user_roles").select("user_id").eq("role", "admin").eq("active", true);
      if (adminListError) throw adminListError;
      if (activeAdmins?.length === 1 && activeAdmins[0].user_id === targetId) {
        return json({ error: "The last active administrator cannot be deleted. Assign another active administrator first." }, 409);
      }
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "set_password") {
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "Password must contain at least 8 characters." }, 400);
      const { error } = await admin.auth.admin.updateUserById(targetId, { password });
      if (error) throw error;
      return json({ success: true });
    }
    if (action === "set_role") {
      const role = String(body.role || "");
      if (!roles.includes(role)) return json({ error: "Choose a valid role." }, 400);
      const { error } = await admin.auth.admin.updateUserById(targetId, { app_metadata: { role } });
      if (error) throw error;
      const { error: roleError } = await admin.from("user_roles").upsert({ user_id: targetId, role, updated_at: new Date().toISOString() });
      if (roleError) throw roleError;
      return json({ success: true });
    }
    if (action === "set_active") {
      const active = Boolean(body.active);
      const { error } = await admin.from("user_roles").update({ active, updated_at: new Date().toISOString() }).eq("user_id", targetId);
      if (error) throw error;
      return json({ success: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("manage-users failed:", message);
    return json({ error: message }, 400);
  }
});
