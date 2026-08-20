export type JobType = "repair" | "service";

export interface JobConfig {
  title: string;
  subjectLabel: string;
  basePath: string;
  newVerb: string;
  icon: string;
}

export const JOB_CONFIG: Record<JobType, JobConfig> = {
  repair: {
    title: "Repair",
    subjectLabel: "Item / serial no.",
    basePath: "/repair",
    newVerb: "New repair",
    icon: "🔧",
  },
  service: {
    title: "Vehicle service",
    subjectLabel: "Vehicle no. / model",
    basePath: "/service",
    newVerb: "New job",
    icon: "🚗",
  },
};

export const JOB_STATUSES = [
  "received",
  "diagnose",
  "in-progress",
  "ready",
  "collected",
] as const;

export const JOB_STATUS_TONE: Record<string, string> = {
  received: "bg-info/15 text-info",
  diagnose: "bg-warn/15 text-warn",
  "in-progress": "bg-warn/15 text-warn",
  ready: "bg-accent/15 text-accent",
  collected: "bg-surface-3 text-text-dim",
};
