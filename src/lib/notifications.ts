import { differenceInMinutes, differenceInHours, parseISO, isBefore } from "date-fns";
import type { Session } from "../types";

export type NotificationKind = "soon" | "in-progress" | "missed";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  patientId: string;
  sessionId: string;
  anchor: Date;
}

export function computeNotifications(sessions: Session[]): AppNotification[] {
  const now = new Date();
  const out: AppNotification[] = [];

  for (const s of sessions) {
    const date = parseISO(s.session_date);
    const patient = `${s.patients?.first_name ?? ""} ${s.patients?.last_name ?? ""}`.trim();

    // 1. Starting within the next 60 minutes
    if (s.status !== "COMPLETED") {
      const minutes = differenceInMinutes(date, now);
      if (minutes >= 0 && minutes <= 60) {
        out.push({
          id: `soon-${s.id}`,
          kind: "soon",
          title: minutes <= 5 ? "Starting now" : `Starts in ${minutes} min`,
          body: `${patient} · ${s.title}`,
          patientId: s.patient_id,
          sessionId: s.id!,
          anchor: date,
        });
      }
    }

    // 2. In-progress for 2+ hours
    if (s.status === "IN PROGRESS") {
      const hours = differenceInHours(now, date);
      if (hours >= 2) {
        out.push({
          id: `in-progress-${s.id}`,
          kind: "in-progress",
          title: "Still in progress?",
          body: `${patient} · marked in progress ${hours}h ago`,
          patientId: s.patient_id,
          sessionId: s.id!,
          anchor: date,
        });
      }
    }

    // 3. Missed: planned in past 7 days, not completed
    if (s.status === "PLANNED" && isBefore(date, now)) {
      const daysAgo = differenceInHours(now, date) / 24;
      if (daysAgo <= 7) {
        out.push({
          id: `missed-${s.id}`,
          kind: "missed",
          title: "Missed appointment",
          body: `${patient} · scheduled ${Math.floor(daysAgo) || 1}d ago`,
          patientId: s.patient_id,
          sessionId: s.id!,
          anchor: date,
        });
      }
    }
  }

  // Sort: soon first, then in-progress, then missed
  const rank: Record<NotificationKind, number> = {
    soon: 0,
    "in-progress": 1,
    missed: 2,
  };
  out.sort((a, b) => {
    const r = rank[a.kind] - rank[b.kind];
    if (r !== 0) return r;
    return a.anchor.getTime() - b.anchor.getTime();
  });

  return out;
}