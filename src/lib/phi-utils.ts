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
 * Re-inserted post-generation before saving to DB.
 */
export const PATIENT_PLACEHOLDER = "[PATIENT]"

/**
 * Replaces all occurrences of [PATIENT] in AI-generated text
 * with the actual patient name. Case-insensitive.
 */
export function reinsertPatientName(
  text: string,
  firstName: string,
  lastName: string
): string {
  const fullName = `${firstName} ${lastName}`.trim()
  if (!fullName) return text
  return text.replace(/\[PATIENT\]/gi, fullName)
}
