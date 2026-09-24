import type { User } from "@supabase/supabase-js";

/** Returns one consistent, uncredentialed display name for the signed-in clinician. */
export function doctorDisplayName(user: User): string {
  const metadataName = user.user_metadata?.["full_name"] ?? user.user_metadata?.["name"];
  const rawName = typeof metadataName === "string" ? metadataName.trim() : "";
  const emailPrefix = user.email?.split("@")[0]?.trim() || "Doctor";
  const name = rawName || emailPrefix;
  const withoutTitle = name.replace(/^dr\.?\s+/i, "").trim() || emailPrefix;
  return `Dr. ${withoutTitle}`;
}