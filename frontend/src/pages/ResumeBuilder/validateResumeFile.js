export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — matches the UI's stated limit

/**
 * Validates a resume file selected for analysis.
 * Returns an object describing the outcome: either { ok: true } or
 * { ok: false, error } where `error` is a user-facing message.
 *
 * @param {File|null|undefined} file
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateResumeFile(file) {
  if (!file) {
    return { ok: false, error: "Please upload a valid PDF file." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Please upload a valid PDF file." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File size must be less than 5MB." };
  }
  return { ok: true };
}
