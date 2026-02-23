/**
 * PHI De-identification Utilities
 *
 * All 18 HIPAA identifiers stay inside Luma's database.
 * These utilities ensure no PHI leaves our boundary in
 * outbound API calls to Perplexity or any AI provider.
 */

export interface AgeTags {
  age_group: "pediatric" | "adult" | "geriatric"
  is_pediatric: boolean
  is_medicare_eligible: boolean
}

/**
 * Converts raw age into clinically relevant tags that preserve
 * medical decision-making context without exposing the actual value.
 */
export function computeAgeTags(age: number): AgeTags {
  return {
    age_group: age < 18 ? "pediatric" : age >= 65 ? "geriatric" : "adult",
    is_pediatric: age < 18,
    is_medicare_eligible: age >= 65,
  }
}

/**
 * Formats age tags as a readable string for AI prompt injection.
 * Example: "Age Group: adult | Pediatric: No | Medicare Eligible: No"
 */
export function formatAgeTagsForPrompt(tags: AgeTags): string {
  return `Age Group: ${tags.age_group} | Pediatric: ${tags.is_pediatric ? "Yes" : "No"} | Medicare Eligible: ${tags.is_medicare_eligible ? "Yes" : "No"}`
}

/**
 * Placeholder token the AI uses instead of the real patient name.
 * Uses double underscores to avoid being stripped by bracket sanitization.
 * Re-inserted post-generation before saving to DB.
 */
export const PATIENT_PLACEHOLDER = "__PATIENT__"

/**
 * Replaces all occurrences of the patient placeholder in AI-generated text
 * with the actual patient name. Handles both __PATIENT__ and legacy [PATIENT].
 * Also catches standalone uppercase PATIENT used as a name (not in compound labels).
 */
export function reinsertPatientName(
  text: string,
  firstName: string,
  lastName: string
): string {
  const fullName = `${firstName} ${lastName}`.trim()
  if (!fullName) return text
  return text
    .replace(/__PATIENT__/g, fullName)
    .replace(/\[PATIENT\]/gi, fullName)
    // Catch standalone PATIENT (all caps) used as name placeholder — not in labels like "PATIENT DIAGNOSES"
    .replace(/\bPATIENT\b(?!\s+(?:DIAGNOS|HISTORY|INFORMATION|DEMOGRAPHICS|DATA|DETAILS|STATUS|ASSESSMENT|RECORD|SUMMARY))/g, fullName)
}
