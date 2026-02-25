/**
 * Validation module exports
 * Provides validation functions for all document types
 */

// Types
export * from "./validation-types"

// Medical Necessity validation
export { validateMedicalNecessity } from "./medical-necessity-validation"
export type { MedicalNecessityValidationResult } from "./medical-necessity-validation"

// Appeal validation
export { validateAppeal } from "./appeal-validation"
export type { AppealValidationResult } from "./appeal-validation"

// Pre-Audit Review validation
export { validateForAudit } from "./audit-validation"
