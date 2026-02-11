// /projects/assets/status-engine.js
// Single source of truth for:
// - Dashboard dropdown options
// - Progress % mapping
// - Progress bar colors + gradient
//
// Usage (ES module):
//   import { STATUS_OPTIONS, getProgressPercent, getProgressBarBackground, canonicalStatus } from "./assets/status-engine.js";

export const STATUS_OPTIONS = [
  "Planning",
  "Approved",
  "Pending",
  "Awaiting",
  "Active",
  "Activated",
  "Work Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Canceled",
  "Inactive"
];

// Colors used across dashboard + project pages (edit here once)
export const STATUS_COLORS = {
  "Planning": "#A0AEC0",
  "Approved": "#CBD5E0",
  "Pending": "#F6AD55",
  "Awaiting": "#FBD38D",
  "Active": "#48BB78",
  "Activated": "#38A169",
  "Work Started": "#ECC94B",
  "In Progress": "#ED8936",
  "Completed": "#276749",
  "On Hold": "#718096",
  "Canceled": "#4A5568",
  "Inactive": "#2D3748"
};

// Canonical flow for gradients (status -> next status)
const FLOW = [
  "Planning",
  "Approved",
  "Pending",
  "Awaiting",
  "Active",
  "Work Started",
  "In Progress",
  "Completed"
];

function norm(s){
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

// Map free-text statuses (project pages) into canonical status options (dashboard)
// Keeps your existing keyword logic (pending/awaiting/payment/deposit/review, etc.)
export function canonicalStatus(statusRaw = ""){
  const s = norm(statusRaw);

  if (!s) return "Inactive";

  // Completed
  if (
    s.includes("completed") ||
    s.includes("complete") ||
    s.includes("done") ||
    s.includes("finalized") ||
    s.includes("finished")
  ) return "Completed";

  // In Progress
  if (s.includes("in progress")) return "In Progress";

  // Work Started
  if (s.includes("work started") || s.includes("started")) return "Work Started";

  // Active / Activated
  if (s.includes("activated")) return "Activated";
  if (s.includes("active")) return "Active";

  // Planning / Approved / Pending / Awaiting bucket
  if (s.includes("approved")) return "Approved";
  if (s.includes("planning") || s.includes("scheduled")) return "Planning";

  // Pending keywords
  if (
    s.includes("pending") ||
    s.includes("review") ||
    s.includes("deposit") ||
    s.includes("payment")
  ) return "Pending";

  // Awaiting keywords
  if (
    s.includes("await") ||
    s.includes("waiting")
  ) return "Awaiting";

  // On Hold / Canceled / Inactive
  if (s.includes("on hold") || s.includes("paused") || s.includes("suspend")) return "On Hold";
  if (s.includes("cancel") || s.includes("canceled") || s.includes("cancelled")) return "Canceled";
  if (s.includes("inactive") || s.includes("expired")) return "Inactive";

  // If it exactly matches one of the options (case-insensitive), keep it
  for (const opt of STATUS_OPTIONS){
    if (norm(opt) === s) return opt;
  }

  // Default fallback
  return "Inactive";
}

// Percent mapping (your agreed logic)
export function getProgressPercent(statusRaw = ""){
  const s = canonicalStatus(statusRaw);

  if (["On Hold", "Canceled", "Inactive"].includes(s)) return 0;
  if (["Planning", "Approved", "Pending", "Awaiting"].includes(s)) return 10;
  if (["Active", "Activated"].includes(s)) return 25;
  if (s === "Work Started") return 35;
  if (s === "In Progress") return 50;
  if (s === "Completed") return 100;

  return 0;
}

function nextInFlow(statusCanonical){
  const cur = (statusCanonical === "Activated") ? "Active" : statusCanonical;
  const idx = FLOW.indexOf(cur);
  if (idx === -1) return null;
  return FLOW[idx + 1] || null;
}

// Returns a CSS background value (solid or gradient) for the progress fill
export function getProgressBarBackground(statusRaw = ""){
  const status = canonicalStatus(statusRaw);

  // Completed: solid (no gradient)
  if (status === "Completed"){
    return STATUS_COLORS["Completed"] || "#276749";
  }

  // Non-flow statuses: solid
  if (["On Hold", "Canceled", "Inactive"].includes(status)){
    return STATUS_COLORS[status] || "#2D3748";
  }

  const from = STATUS_COLORS[status] || "#48BB78";
  const nxt = nextInFlow(status);
  const to = (nxt && STATUS_COLORS[nxt]) ? STATUS_COLORS[nxt] : from;

  // Smooth gradient from current status to next status
  return `linear-gradient(90deg, ${from}, ${to})`;
}
