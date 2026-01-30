import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuditAction =
  | "CREATE_USER"
  | "UPDATE_USER_PROFILE"
  | "RESET_PASSWORD"
  | "DELETE_USER"
  | "CREATE_GROUP"
  | "UPDATE_GROUP"
  | "DELETE_GROUP";

export async function logAuditEvent(params: {
  actor_id: string;
  actor_name?: string | null;
  action: AuditAction;
  target_type?: "user" | "group" | string | null;
  target_id?: string | null;
  target_name?: string | null;
  details?: any;
}) {
  const {
    actor_id,
    actor_name,
    action,
    target_type,
    target_id,
    target_name,
    details,
  } = params;

  // No tires la app si falla la auditoría: mejor log silencioso.
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id,
      actor_name: actor_name ?? null,
      action,
      target_type: target_type ?? null,
      target_id: target_id ?? null,
      target_name: target_name ?? null,
      details: details ?? {},
    });
  } catch {
    // ignore
  }
}
