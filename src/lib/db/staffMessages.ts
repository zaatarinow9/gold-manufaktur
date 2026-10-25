import "server-only";

import type { AdminViewer } from "@/lib/db/adminScope";
import { createAdminNotification } from "@/lib/db/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * In-app conversations along the chain of command:
 *   team:<employeeId>         an employee and their workshop manager
 *   management:<workshopId>   a workshop manager and head office
 */

export type ThreadChannel = "team" | "management";
export type AuthorKind = "admin" | "manager" | "employee";

export type StaffMessage = {
  authorKind: AuthorKind;
  authorName: string;
  body: string;
  createdAt: string;
  id: string;
  isMine: boolean;
  orderId: string | null;
  orderNumber: string;
};

export type ThreadSummary = {
  channel: ThreadChannel;
  key: string;
  lastAt: string;
  lastPreview: string;
  /** Who you talk to in this thread. */
  title: string;
  unread: number;
  workshopName: string;
};

type ThreadAccess = {
  channel: ThreadChannel;
  employeeId: string | null;
  employeeName: string;
  employeeProfileId: string | null;
  key: string;
  managerName: string;
  managerProfileId: string | null;
  workshopId: string;
  workshopName: string;
};

const db = () => createSupabaseAdminClient();

export function authorKindFor(viewer: AdminViewer): AuthorKind | null {
  if (viewer.role === "super_admin") return "admin";
  if (viewer.role === "employee") return viewer.managedWorkshopId ? "manager" : "employee";
  return null;
}

export function teamThreadKey(employeeId: string) {
  return `team:${employeeId}`;
}

export function managementThreadKey(workshopId: string) {
  return `management:${workshopId}`;
}

function parseKey(key: string): { channel: ThreadChannel; id: string } | null {
  const match = key.match(/^(team|management):([0-9a-f-]{36})$/i);
  return match ? { channel: match[1] as ThreadChannel, id: match[2] } : null;
}

async function loadWorkshopWithManager(workshopId: string) {
  const supabase = db();
  const { data: workshop } = await supabase
    .from("workshops")
    .select("id, name, manager_employee_id")
    .eq("id", workshopId)
    .maybeSingle();
  if (!workshop) return null;
  const { data: manager } = workshop.manager_employee_id
    ? await supabase.from("employees").select("id, full_name, profile_id").eq("id", workshop.manager_employee_id).maybeSingle()
    : { data: null };
  return { manager, workshop };
}

/** Checks the viewer may read and write this thread. */
export async function resolveThread(viewer: AdminViewer, key: string): Promise<ThreadAccess> {
  const parsed = parseKey(key);
  if (!parsed) throw new Error("THREAD_NOT_FOUND");
  const supabase = db();

  if (parsed.channel === "management") {
    const loaded = await loadWorkshopWithManager(parsed.id);
    if (!loaded) throw new Error("THREAD_NOT_FOUND");
    const allowed = viewer.role === "super_admin" || viewer.managedWorkshopId === parsed.id;
    if (!allowed) throw new Error("PERMISSION_DENIED");
    return {
      channel: "management",
      employeeId: null,
      employeeName: "",
      employeeProfileId: null,
      key,
      managerName: loaded.manager?.full_name ?? "",
      managerProfileId: loaded.manager?.profile_id ?? null,
      workshopId: loaded.workshop.id,
      workshopName: loaded.workshop.name,
    };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id, full_name, profile_id, workshop_id")
    .eq("id", parsed.id)
    .maybeSingle();
  if (!employee?.workshop_id) throw new Error("THREAD_NOT_FOUND");
  const allowed =
    viewer.linkedEmployeeId === employee.id ||
    (Boolean(viewer.managedWorkshopId) && viewer.managedWorkshopId === employee.workshop_id);
  if (!allowed || viewer.role !== "employee") throw new Error("PERMISSION_DENIED");
  const loaded = await loadWorkshopWithManager(employee.workshop_id);
  if (!loaded) throw new Error("THREAD_NOT_FOUND");
  return {
    channel: "team",
    employeeId: employee.id,
    employeeName: employee.full_name,
    employeeProfileId: employee.profile_id,
    key,
    managerName: loaded.manager?.full_name ?? "",
    managerProfileId: loaded.manager?.profile_id ?? null,
    workshopId: loaded.workshop.id,
    workshopName: loaded.workshop.name,
  };
}

function threadFilter(access: Pick<ThreadAccess, "channel" | "employeeId" | "workshopId">) {
  let query = db()
    .from("staff_messages")
    .select("id, author_kind, author_name, author_profile_id, body, created_at, order_id, channel, employee_id, workshop_id")
    .eq("workshop_id", access.workshopId)
    .eq("channel", access.channel);
  if (access.channel === "team" && access.employeeId) query = query.eq("employee_id", access.employeeId);
  return query;
}

async function orderNumbers(orderIds: string[]) {
  const ids = [...new Set(orderIds)];
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await db().from("orders").select("id, internal_order_number").in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row.internal_order_number ?? ""]));
}

export async function getThreadMessages(viewer: AdminViewer, key: string, orderId?: string) {
  const access = await resolveThread(viewer, key);
  let query = threadFilter(access);
  if (orderId) query = query.eq("order_id", orderId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("MESSAGES_LOAD_FAILED");
  const rows = (data ?? []).reverse();
  const numbers = await orderNumbers(rows.map((row) => row.order_id).filter((id): id is string => Boolean(id)));
  const messages: StaffMessage[] = rows.map((row) => ({
    authorKind: row.author_kind as AuthorKind,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    id: row.id,
    isMine: row.author_profile_id === viewer.id,
    orderId: row.order_id,
    orderNumber: row.order_id ? numbers.get(row.order_id) ?? "" : "",
  }));
  return { access, messages };
}

async function getReadMarkers(profileId: string) {
  const { data } = await db().from("staff_message_reads").select("thread_key, last_read_at").eq("profile_id", profileId);
  return new Map((data ?? []).map((row) => [row.thread_key, row.last_read_at]));
}

/** Every thread this person takes part in, newest first. */
export async function listThreads(viewer: AdminViewer): Promise<ThreadSummary[]> {
  const supabase = db();
  const descriptors: Array<{ channel: ThreadChannel; employeeId: string | null; key: string; title: string; workshopId: string; workshopName: string }> = [];

  if (viewer.role === "super_admin") {
    const { data: workshops } = await supabase.from("workshops").select("id, name, manager_employee_id").order("name");
    const managerIds = (workshops ?? []).map((w) => w.manager_employee_id).filter((id): id is string => Boolean(id));
    const { data: managers } = managerIds.length
      ? await supabase.from("employees").select("id, full_name").in("id", managerIds)
      : { data: [] };
    for (const workshop of workshops ?? []) {
      const manager = (managers ?? []).find((row) => row.id === workshop.manager_employee_id);
      descriptors.push({
        channel: "management",
        employeeId: null,
        key: managementThreadKey(workshop.id),
        title: manager?.full_name || workshop.name,
        workshopId: workshop.id,
        workshopName: workshop.name,
      });
    }
  } else if (viewer.role === "employee" && viewer.managedWorkshopId) {
    const loaded = await loadWorkshopWithManager(viewer.managedWorkshopId);
    if (loaded) {
      descriptors.push({
        channel: "management",
        employeeId: null,
        key: managementThreadKey(loaded.workshop.id),
        title: "",
        workshopId: loaded.workshop.id,
        workshopName: loaded.workshop.name,
      });
      const { data: members } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("workshop_id", loaded.workshop.id)
        .neq("id", viewer.linkedEmployeeId ?? "")
        .order("full_name");
      for (const member of members ?? []) {
        descriptors.push({
          channel: "team",
          employeeId: member.id,
          key: teamThreadKey(member.id),
          title: member.full_name,
          workshopId: loaded.workshop.id,
          workshopName: loaded.workshop.name,
        });
      }
    }
  } else if (viewer.role === "employee" && viewer.linkedEmployeeId && viewer.workshopId) {
    const loaded = await loadWorkshopWithManager(viewer.workshopId);
    if (loaded) {
      descriptors.push({
        channel: "team",
        employeeId: viewer.linkedEmployeeId,
        key: teamThreadKey(viewer.linkedEmployeeId),
        title: loaded.manager?.full_name ?? "",
        workshopId: loaded.workshop.id,
        workshopName: loaded.workshop.name,
      });
    }
  }

  if (descriptors.length === 0) return [];

  const workshopIds = [...new Set(descriptors.map((d) => d.workshopId))];
  const [{ data: recent }, markers] = await Promise.all([
    supabase
      .from("staff_messages")
      .select("workshop_id, channel, employee_id, author_profile_id, author_name, body, created_at")
      .in("workshop_id", workshopIds)
      .order("created_at", { ascending: false })
      .limit(1000),
    getReadMarkers(viewer.id),
  ]);

  return descriptors
    .map((descriptor) => {
      const messages = (recent ?? []).filter(
        (row) =>
          row.workshop_id === descriptor.workshopId &&
          row.channel === descriptor.channel &&
          (descriptor.channel === "management" || row.employee_id === descriptor.employeeId)
      );
      const lastRead = markers.get(descriptor.key) ?? "";
      const last = messages[0];
      return {
        channel: descriptor.channel,
        key: descriptor.key,
        lastAt: last?.created_at ?? "",
        lastPreview: last ? `${last.author_name}: ${last.body}`.slice(0, 140) : "",
        title: descriptor.title,
        unread: messages.filter((row) => row.author_profile_id !== viewer.id && row.created_at > lastRead).length,
        workshopName: descriptor.workshopName,
      };
    })
    .sort((left, right) => (right.lastAt || "").localeCompare(left.lastAt || ""));
}

export async function getUnreadMessageCount(viewer: AdminViewer) {
  if (!authorKindFor(viewer)) return 0;
  try {
    const threads = await listThreads(viewer);
    return threads.reduce((sum, thread) => sum + thread.unread, 0);
  } catch {
    return 0;
  }
}

export async function markThreadRead(viewer: AdminViewer, key: string) {
  await resolveThread(viewer, key);
  await db()
    .from("staff_message_reads")
    .upsert({ last_read_at: new Date().toISOString(), profile_id: viewer.id, thread_key: key });
}

/** Inserts a message without permission checks (server-side flows only). */
export async function postSystemMessage(input: {
  authorKind: AuthorKind;
  authorName: string;
  authorProfileId: string | null;
  body: string;
  channel: ThreadChannel;
  employeeId?: string | null;
  orderId?: string | null;
  workshopId: string;
}) {
  await db().from("staff_messages").insert({
    author_kind: input.authorKind,
    author_name: input.authorName,
    author_profile_id: input.authorProfileId,
    body: input.body.slice(0, 4000),
    channel: input.channel,
    employee_id: input.employeeId ?? null,
    order_id: input.orderId ?? null,
    workshop_id: input.workshopId,
  });
}

export async function postMessage(viewer: AdminViewer, input: { body: string; key: string; orderId?: string | null }) {
  const body = input.body.trim();
  if (!body) throw new Error("MESSAGE_EMPTY");
  if (body.length > 4000) throw new Error("MESSAGE_TOO_LONG");
  const authorKind = authorKindFor(viewer);
  if (!authorKind) throw new Error("PERMISSION_DENIED");
  const access = await resolveThread(viewer, input.key);

  let orderId: string | null = null;
  if (input.orderId) {
    const { data: order } = await db().from("orders").select("id, workshop_id").eq("id", input.orderId).maybeSingle();
    if (order && order.workshop_id === access.workshopId) orderId = order.id;
  }

  const { error } = await db().from("staff_messages").insert({
    author_kind: authorKind,
    author_name: viewer.name,
    author_profile_id: viewer.id,
    body,
    channel: access.channel,
    employee_id: access.employeeId,
    order_id: orderId,
    workshop_id: access.workshopId,
  });
  if (error) throw new Error("MESSAGE_SEND_FAILED");
  await markThreadRead(viewer, input.key);

  // Tell the other side.
  const preview = `${viewer.name}: ${body}`.slice(0, 180);
  const notify = (profileId: string | null) =>
    profileId && profileId !== viewer.id
      ? createAdminNotification({
          entityId: orderId,
          entityType: "message",
          linkPath: `/admin/messages?thread=${encodeURIComponent(input.key)}`,
          message: preview,
          profileId,
          title: `message:${access.channel}`,
          type: "system",
          workshopId: access.workshopId,
        })
      : Promise.resolve(null);

  if (access.channel === "team") {
    await notify(authorKind === "employee" ? access.managerProfileId : access.employeeProfileId);
  } else if (authorKind === "manager") {
    const { data: office } = await db()
      .from("profiles")
      .select("id")
      .eq("role", "super_admin")
      .eq("is_active", true)
      .is("deleted_at", null);
    await Promise.all((office ?? []).map((row) => notify(row.id)));
  } else {
    await notify(access.managerProfileId);
  }
}

/** The conversations that concern one order, as seen by this person. */
export async function getOrderThreads(
  viewer: AdminViewer,
  order: { employeeId: string | null; id: string; workshopId: string | null }
) {
  if (!order.workshopId) return [];
  const keys: string[] = [];
  if (viewer.role === "super_admin") keys.push(managementThreadKey(order.workshopId));
  if (viewer.role === "employee" && viewer.managedWorkshopId === order.workshopId) {
    keys.push(managementThreadKey(order.workshopId));
    if (order.employeeId && order.employeeId !== viewer.linkedEmployeeId) keys.push(teamThreadKey(order.employeeId));
  } else if (viewer.role === "employee" && viewer.linkedEmployeeId && viewer.linkedEmployeeId === order.employeeId) {
    keys.push(teamThreadKey(viewer.linkedEmployeeId));
  }

  const threads = await Promise.all(
    keys.map(async (key) => {
      try {
        const { access, messages } = await getThreadMessages(viewer, key, order.id);
        return { access, key, messages };
      } catch {
        return null;
      }
    })
  );
  return threads.filter((thread): thread is NonNullable<typeof thread> => thread !== null);
}
