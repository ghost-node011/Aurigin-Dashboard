// Shared labels and badge tones for BNI email statuses
export const EMAIL_STATUS = {
  queued: { label: "Queued", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  bounced: { label: "Bounced", tone: "danger" },
  complained: { label: "Marked spam", tone: "danger" },
  rejected: { label: "Rejected", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const REQUEST_STATUS = {
  queued: { label: "Queued", tone: "neutral" },
  sending: { label: "Sending", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const CATEGORY_LABEL = {
  "interior designer": "Interior designers",
  architects: "Architects",
  construction: "Construction",
  "real estate": "Real estate",
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
