import { Platform } from "react-native";

/**
 * Consistent shadow for cards.
 */
export const cardShadow = {
  shadowColor: "#7c3aed",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

/**
 * Stronger shadow for modals and floating elements.
 */
export const modalShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  elevation: 8,
};

/**
 * Status colors — used by pills, badges, and buttons.
 */
export const statusColors: Record<string, { bg: string; text: string }> = {
  PLANNED: { bg: "#f1f5f9", text: "#475569" },        // slate
  "IN PROGRESS": { bg: "#ede9fe", text: "#6d28d9" },  // purple
  COMPLETED: { bg: "#d1fae5", text: "#047857" },      // emerald
};