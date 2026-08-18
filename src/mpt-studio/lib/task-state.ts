export const MPT_TASK_FAILED = -1;
export const MPT_TASK_COMPLETE = 1;
export const MPT_TASK_PROCESSING = 4;

export function mptTaskLabelKey(state: number | undefined): "failed" | "complete" | "processing" {
  if (state === MPT_TASK_FAILED) return "failed";
  if (state === MPT_TASK_COMPLETE) return "complete";
  return "processing";
}
