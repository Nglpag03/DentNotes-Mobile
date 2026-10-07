export type SessionTemplate = {
  id: string;
  label: string;
  emoji: string;
  title: string;
  description: string;
  next_steps?: string;
};

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: "cleaning",
    label: "Cleaning",
    emoji: "🪥",
    title: "Routine cleaning",
    description:
      "Removed plaque and calculus. Polished all surfaces. No signs of decay.",
    next_steps: "Return in 6 months for a routine check-up.",
  },
  {
    id: "braces",
    label: "Braces adjustment",
    emoji: "🦷",
    title: "Braces adjustment",
    description:
      "Adjusted archwire, replaced elastic ligatures. Patient reported mild sensitivity.",
    next_steps: "Continue elastic wear, review progress in 4 weeks.",
  },
  {
    id: "filling",
    label: "Filling",
    emoji: "🩹",
    title: "Composite filling",
    description:
      "Restored cavity with composite resin. Occlusion checked. Patient tolerated procedure well.",
    next_steps: "Avoid hard foods on that side for 24 hours.",
  },
  {
    id: "root-canal",
    label: "Root canal",
    emoji: "🧪",
    title: "Root canal follow-up",
    description:
      "Reviewed canal healing. No signs of reinfection. Restored access with temporary filling.",
    next_steps: "Permanent crown placement in 2–3 weeks.",
  },
  {
    id: "extraction",
    label: "Extraction",
    emoji: "🦷",
    title: "Tooth extraction",
    description:
      "Simple extraction completed under local anesthesia. Socket cleaned and packed. Bleeding controlled.",
    next_steps:
      "Apply ice packs for 20 min every hour. Soft diet for 48 hours. No straws for a week.",
  },
  {
    id: "post-op",
    label: "Post-op check",
    emoji: "✅",
    title: "Post-op review",
    description:
      "Patient reports good healing. No pain or swelling. All post-operative instructions followed.",
    next_steps: "No further follow-up needed for this procedure.",
  },
  {
    id: "whitening",
    label: "Whitening",
    emoji: "✨",
    title: "Teeth whitening session",
    description:
      "Applied whitening gel in-office for 45 minutes. Patient tolerated well with minimal sensitivity.",
    next_steps: "Avoid staining foods and drinks for 48 hours.",
  },
];