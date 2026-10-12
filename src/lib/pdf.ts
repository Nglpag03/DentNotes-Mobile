import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { format, parseISO } from "date-fns";
import type { Patient, Session, SessionStatus } from "../types";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Platform } from 'react-native';
const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Upcoming",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Done",
};

function escapeHtml(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br/>");
}

export function buildPatientProfileHtml(
  patient: Patient,
  sessions: Session[],
): string {
  const today = format(new Date(), "MMMM d, yyyy");
  const patientId = (patient.id || "").slice(0, 8).toUpperCase();

  const sessionHtml = sessions
    .map(
      (s) => `
      <div class="session">
        <div class="session-header">
          <div class="session-title">${escapeHtml(s.title)}</div>
          <div class="session-status status-${s.status
            .toLowerCase()
            .replace(" ", "-")}">${STATUS_LABEL[s.status]}</div>
        </div>
        <div class="session-meta">
          ${format(parseISO(s.session_date), "EEEE, MMMM d, yyyy")} · ${format(
            parseISO(s.session_date),
            "h:mm a",
          )}
          ${s.room ? ` · ${escapeHtml(s.room)}` : ""}
        </div>
        ${
          s.description
            ? `<div class="session-body">${escapeHtml(s.description)}</div>`
            : ""
        }
        ${
          s.next_steps
            ? `<div class="next-step"><strong>Next step:</strong> ${escapeHtml(
                s.next_steps,
              )}</div>`
            : ""
        }
      </div>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      font-size: 11pt;
      line-height: 1.5;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7c3aed;
    }
    .generated {
      font-size: 9pt;
      color: #64748b;
      text-align: right;
    }
    h1 {
      font-size: 20pt;
      font-weight: 800;
      margin: 0 0 4px 0;
    }
    .patient-id {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      font-weight: 700;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-top: 24px;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
    }
    .info-cell .label {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }
    .info-cell .value {
      font-size: 11pt;
      font-weight: 600;
      margin-top: 2px;
    }
    .session {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .session-title {
      font-size: 12pt;
      font-weight: 700;
    }
    .session-status {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }
    .status-planned { background: #f1f5f9; color: #475569; }
    .status-in-progress { background: #ede9fe; color: #6d28d9; }
    .status-completed { background: #d1fae5; color: #047857; }
    .session-meta {
      font-size: 9pt;
      color: #64748b;
      margin-top: 4px;
    }
    .session-body {
      margin-top: 10px;
      font-size: 10pt;
      color: #334155;
    }
    .next-step {
      margin-top: 10px;
      padding: 8px 10px;
      background: #faf5ff;
      border-radius: 6px;
      font-size: 10pt;
      color: #334155;
    }
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    .empty {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">DentNotes</div>
      <div class="patient-id">Patient #DN-${patientId}</div>
    </div>
    <div class="generated">
      <strong>Generated</strong><br/>
      ${today}
    </div>
  </div>

  <h1>${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</h1>
  ${
    patient.age || patient.gender
      ? `<div class="session-meta">${
          patient.age ? `${patient.age} years` : ""
        }${
          patient.age && patient.gender ? " · " : ""
        }${patient.gender ? escapeHtml(patient.gender) : ""}</div>`
      : ""
  }

  ${
    patient.phone || patient.email
      ? `<div class="session-meta">${
          patient.phone ? escapeHtml(patient.phone) : ""
        }${
          patient.phone && patient.email ? " · " : ""
        }${patient.email ? escapeHtml(patient.email) : ""}</div>`
      : ""
  }

  <div class="section-title">Health Overview</div>
  <div class="info-grid">
    <div class="info-cell">
      <div class="label">Primary Condition</div>
      <div class="value">${escapeHtml(patient.condition) || "Not recorded"}</div>
    </div>
    <div class="info-cell">
      <div class="label">Allergies</div>
      <div class="value">${escapeHtml(patient.allergies) || "None reported"}</div>
    </div>
    <div class="info-cell">
      <div class="label">Medications</div>
      <div class="value">${escapeHtml(patient.medications) || "None reported"}</div>
    </div>
    <div class="info-cell">
      <div class="label">Total Visits</div>
      <div class="value">${sessions.length}</div>
    </div>
  </div>

  ${
    patient.notes
      ? `
    <div class="section-title">Notes</div>
    <div style="font-size:10pt; color:#334155;">${escapeHtml(
      patient.notes,
    )}</div>`
      : ""
  }

  <div class="section-title">Check-up History</div>
  ${
    sessions.length > 0
      ? sessionHtml
      : `<div class="empty">No check-ups on record.</div>`
  }

  <div class="footer">
    This document contains confidential patient information.<br/>
    Handle in accordance with your local privacy regulations.
  </div>
</body>
</html>`;
}

export async function downloadPatientProfilePdf(
  patient: Patient,
  sessions: Session[],
): Promise<void> {
  const html = buildPatientProfileHtml(patient, sessions);

  // 1. Generate PDF with base64 (this works reliably)
  const { base64 } = await Print.printToFileAsync({
    html,
    base64: true,
  });

  if (!base64) {
    throw new Error("Failed to generate PDF data.");
  }

  const filename = `${patient.first_name}_${patient.last_name}_DentNotes.pdf`.replace(
    /\s+/g,
    "_",
  );

  if (Platform.OS === "android") {
    // 👇 ANDROID: Save directly to Downloads folder
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
      FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download"),
    );

    if (!permissions.granted) {
      // Fallback: save to app storage + share
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `Save ${patient.first_name}'s profile`,
        });
      }
      return;
    }

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      filename,
      "application/pdf",
    );

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return;
  }

  // 👇 iOS: Write to document dir then show share sheet (standard iOS pattern)
  const destUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    try {
      await Sharing.shareAsync(destUri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${patient.first_name}'s profile`,
        UTI: "com.adobe.pdf",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isKnownBug =
        message.includes("dispatchCancelPendingInputEvents") ||
        message.includes("shareAsync has been rejected");
      if (!isKnownBug) throw err;
    }
  } else {
    await Print.printAsync({ uri: destUri });
  }
}