export type BadgeTone = "default" | "success" | "warning" | "error" | "info" | "muted" | "accent";

export function scoreLabelTone(label: string): BadgeTone {
  if (label === "KEEP") return "success";
  if (label === "BORDERLINE") return "warning";
  return "error";
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "won":
    case "healthy":
    case "ready":
    case "success":
    case "connected":
    case "shipped":
    case "active":
    case "enabled":
      return "success";
    case "warning":
    case "follow_up_due":
    case "paused":
    case "queued":
    case "building":
    case "mock":
    case "planned":
      return "warning";
    case "error":
    case "lost":
    case "rejected":
    case "missing":
    case "disabled":
      return "error";
    case "new":
    case "info":
    case "approved":
    case "replied":
    case "contacted":
      return "info";
    default:
      return "muted";
  }
}
