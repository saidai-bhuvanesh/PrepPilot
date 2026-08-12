import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  validateResumeFile,
} from "./validateResumeFile";

const makeFile = ({ type = "application/pdf", size = 1024 } = {}) => {
  const file = new File(["x"], "resume.pdf", { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
};

describe("validateResumeFile", () => {
  it("accepts a PDF within the 5MB limit", () => {
    expect(validateResumeFile(makeFile({ size: MAX_FILE_SIZE_BYTES }))).toEqual({
      ok: true,
    });
    expect(validateResumeFile(makeFile({ size: MAX_FILE_SIZE_BYTES - 1 }))).toEqual({
      ok: true,
    });
  });

  it("rejects a PDF larger than 5MB", () => {
    const result = validateResumeFile(makeFile({ size: MAX_FILE_SIZE_BYTES + 1 }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("File size must be less than 5MB.");
  });

  it("rejects a non-PDF mime type regardless of size", () => {
    const result = validateResumeFile(
      makeFile({ type: "image/jpeg", size: 1024 })
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Please upload a valid PDF file.");
  });

  it("rejects when no file is provided", () => {
    expect(validateResumeFile(null).ok).toBe(false);
    expect(validateResumeFile(undefined).ok).toBe(false);
  });
});
