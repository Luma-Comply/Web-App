export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          provider_npi: string | null
          specialty: string | null
          practice_name: string | null
          subscription_tier: 'solo' | 'practice' | 'group'
          cases_remaining_this_month: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          provider_npi?: string | null
          specialty?: string | null
          practice_name?: string | null
          subscription_tier?: 'solo' | 'practice' | 'group'
          cases_remaining_this_month?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          provider_npi?: string | null
          specialty?: string | null
          practice_name?: string | null
          subscription_tier?: 'solo' | 'practice' | 'group'
          cases_remaining_this_month?: number
          created_at?: string
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          user_id: string
          doc_type: 'biologics_pa' | 'medical_necessity' | 'appeal'
          patient_first_name: string
          patient_last_name: string
          patient_age: number
          patient_state: string
          patient_gender: string | null
          diagnosis_codes: Json
          disease_activity: string | null
          lab_values: string | null
          prior_treatments: string | null
          requested_medication: string
          medication_dose: string
          payer_type: string
          payer_name: string
          generated_output: string | null
          edited_output: string | null
          status: 'draft' | 'submitted' | 'approved' | 'denied'
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          doc_type: 'biologics_pa' | 'medical_necessity' | 'appeal'
          patient_first_name: string
          patient_last_name: string
          patient_age: number
          patient_state: string
          patient_gender?: string | null
          diagnosis_codes: Json
          disease_activity?: string | null
          lab_values?: string | null
          prior_treatments?: string | null
          requested_medication: string
          medication_dose: string
          payer_type: string
          payer_name: string
          generated_output?: string | null
          edited_output?: string | null
          status?: 'draft' | 'submitted' | 'approved' | 'denied'
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          doc_type?: 'biologics_pa' | 'medical_necessity' | 'appeal'
          patient_first_name?: string
          patient_last_name?: string
          patient_age?: number
          patient_state?: string
          patient_gender?: string | null
          diagnosis_codes?: Json
          disease_activity?: string | null
          lab_values?: string | null
          prior_treatments?: string | null
          requested_medication?: string
          medication_dose?: string
          payer_type?: string
          payer_name?: string
          generated_output?: string | null
          edited_output?: string | null
          status?: 'draft' | 'submitted' | 'approved' | 'denied'
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
      }
    }
  }
}
