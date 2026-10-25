type Translator = (key: string, values?: Record<string, string>) => string;

type NotificationLike = {
  message: string;
  title: string;
  type: string;
};

/**
 * Notifications are stored with a fixed (English or German) text written by
 * the server or database function that created them. This maps every known
 * template to the "Admin.notifications" messages so the dashboard shows them
 * in the viewer's language. Unknown texts (e.g. a customer's own message)
 * are returned unchanged.
 */
export function localizeNotification(notification: NotificationLike, t: Translator) {
  const title = notification.title.trim();
  const message = notification.message.trim();
  let match: RegExpMatchArray | null;

  // Newer notifications store a stable code as their title.
  if (title === "workshop_order_received") {
    return { message, title: t("workshopOrderReceived") };
  }
  if (title === "task_assigned") {
    return { message, title: t("newTask") };
  }
  if ((match = title.match(/^task_status:([a-z_]+)$/))) {
    return { message, title: t(`taskStatus_${match[1]}`) };
  }
  if ((match = title.match(/^message:(team|management)$/))) {
    return { message, title: t("newMessage") };
  }

  if (notification.type === "ticket_created" && (match = title.match(/^Support request for (.+)$/))) {
    return { message, title: t("ticketCreated", { ref: match[1] }) };
  }

  if (title === "New customer inquiry") {
    match = message.match(/^(.*) sent a general inquiry\.$/);
    return {
      message: match ? t("contactInquiryMessage", { name: match[1] }) : message,
      title: t("newContactInquiry"),
    };
  }

  if (title === "New product inquiry") {
    match = message.match(/^(.*) sent a request for (.*)\.$/);
    return {
      message: match ? t("productInquiryMessage", { name: match[1], product: match[2] }) : message,
      title: t("newProductInquiry"),
    };
  }

  if (notification.type === "order_created" && (match = title.match(/^(.+) created$/))) {
    const ref = match[1];
    const assigned = message.match(/^(.*) was created and assigned to a workshop\.$/);
    const waiting = message.match(/^(.*) was created and is waiting for workshop assignment\.$/);
    return {
      message: assigned
        ? t("orderCreatedAssigned", { product: assigned[1] })
        : waiting
          ? t("orderCreatedWaiting", { product: waiting[1] })
          : message,
      title: t("orderCreated", { ref }),
    };
  }

  if ((match = title.match(/^(.+) updated$/))) {
    return {
      message: message === "Order assignment and status updated." ? t("orderUpdatedMessage") : message,
      title: t("orderUpdated", { ref: match[1] }),
    };
  }

  if (title === "Zuweisung zurückgezogen") {
    match = message.match(/^(.+) wurde in die Admin-Warteschlange zurückgegeben\.$/);
    return {
      message: match ? t("assignmentWithdrawnMessage", { ref: match[1] }) : message,
      title: t("assignmentWithdrawn"),
    };
  }

  if (title === "Auftrag zugewiesen" || title === "Zuweisung aktualisiert") {
    const assigned = message.match(/^(.+) wurde (.+) zugewiesen\.$/);
    const updated = message.match(/^(.+) wurde aktualisiert\.$/);
    return {
      message: assigned
        ? t("orderAssignedMessage", { name: assigned[2], ref: assigned[1] })
        : updated
          ? t("orderUpdatedRef", { ref: updated[1] })
          : message,
      title: title === "Auftrag zugewiesen" ? t("orderAssigned") : t("assignmentUpdated"),
    };
  }

  if (title === "Aufgabenstatus aktualisiert") {
    return { message, title: t("taskStatusUpdated") };
  }

  if (title === "Neuer Werkstattauftrag") {
    return { message: t("newWorkshopOrderMessage"), title: t("newWorkshopOrder") };
  }

  if (title === "Neue Aufgabe zugewiesen") {
    return { message: t("newTaskMessage"), title: t("newTask") };
  }

  return { message, title };
}
