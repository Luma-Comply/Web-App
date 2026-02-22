export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      case_documents: {
        Row: {
          case_id: string | null
          created_at: string | null
          file_path: string
          file_type: string
          id: string
          is_redacted: boolean | null
          original_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          file_path: string
          file_type: string
          id?: string
          is_redacted?: boolean | null
          original_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          file_path?: string
          file_type?: string
          id?: string
          is_redacted?: boolean | null
          original_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          case_id: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_suggested_forms: {
        Row: {
          case_id: string
          confidence: string | null
          created_at: string | null
          description: string | null
          download_url: string | null
          form_type: string | null
          id: string
          is_external: boolean | null
          payer: string | null
          source_snippets: Json | null
          source_urls: Json | null
          state: string | null
          title: string
        }
        Insert: {
          case_id: string
          confidence?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          form_type?: string | null
          id?: string
          is_external?: boolean | null
          payer?: string | null
          source_snippets?: Json | null
          source_urls?: Json | null
          state?: string | null
          title: string
        }
        Update: {
          case_id?: string
          confidence?: string | null
          created_at?: string | null
          description?: string | null
          download_url?: string | null
          form_type?: string | null
          id?: string
          is_external?: boolean | null
          payer?: string | null
          source_snippets?: Json | null
          source_urls?: Json | null
          state?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_suggested_forms_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          claim_amount: number | null
          created_at: string | null
          created_by_email: string | null
          decision_date: string | null
          denial_category: string | null
          denial_notes: string | null
          denial_reason: string | null
          diagnosis_codes: Json
          disease_activity: string | null
          doc_type: string
          edited_output: string | null
          expected_decision_date: string | null
          followup_date: string | null
          generated_output: string | null
          id: string
          is_archived: boolean | null
          lab_values: string | null
          medication_dose: string
          metadata: Json | null
          pa_expiration_date: string | null
          pa_reference_number: string | null
          parent_case_id: string | null
          patient_age: number
          patient_first_name: string
          patient_gender: string | null
          patient_last_name: string
          patient_state: string
          payer_name: string
          payer_type: string
          prior_treatments: string | null
          requested_medication: string
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          claim_amount?: number | null
          created_at?: string | null
          created_by_email?: string | null
          decision_date?: string | null
          denial_category?: string | null
          denial_notes?: string | null
          denial_reason?: string | null
          diagnosis_codes?: Json
          disease_activity?: string | null
          doc_type: string
          edited_output?: string | null
          expected_decision_date?: string | null
          followup_date?: string | null
          generated_output?: string | null
          id?: string
          is_archived?: boolean | null
          lab_values?: string | null
          medication_dose: string
          metadata?: Json | null
          pa_expiration_date?: string | null
          pa_reference_number?: string | null
          parent_case_id?: string | null
          patient_age: number
          patient_first_name: string
          patient_gender?: string | null
          patient_last_name: string
          patient_state: string
          payer_name: string
          payer_type: string
          prior_treatments?: string | null
          requested_medication: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          claim_amount?: number | null
          created_at?: string | null
          created_by_email?: string | null
          decision_date?: string | null
          denial_category?: string | null
          denial_notes?: string | null
          denial_reason?: string | null
          diagnosis_codes?: Json
          disease_activity?: string | null
          doc_type?: string
          edited_output?: string | null
          expected_decision_date?: string | null
          followup_date?: string | null
          generated_output?: string | null
          id?: string
          is_archived?: boolean | null
          lab_values?: string | null
          medication_dose?: string
          metadata?: Json | null
          pa_expiration_date?: string | null
          pa_reference_number?: string | null
          parent_case_id?: string | null
          patient_age?: number
          patient_first_name?: string
          patient_gender?: string | null
          patient_last_name?: string
          patient_state?: string
          payer_name?: string
          payer_type?: string
          prior_treatments?: string | null
          requested_medication?: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_parent_case_id_fkey"
            columns: ["parent_case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_contact_logs: {
        Row: {
          contact_id: string
          content: string
          created_at: string | null
          created_by_id: string
          id: string
          log_type: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string | null
          created_by_id: string
          id?: string
          log_type: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string | null
          created_by_id?: string
          id?: string
          log_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_contact_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "enterprise_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_contact_logs_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_contacts: {
        Row: {
          background: string | null
          contact_name: string
          created_at: string | null
          created_by_id: string
          deal_value: number | null
          email: string | null
          hospital_beds: string | null
          hospital_details: string | null
          hospital_location: string | null
          hospital_system: string | null
          id: string
          implementation_high: number | null
          is_active_contract: boolean
          implementation_low: number | null
          monthly_price_high: number | null
          monthly_price_low: number | null
          notes: string | null
          organization: string
          phone: string | null
          profile_image_url: string | null
          sort_order: number | null
          status: string
          strategy_type: string | null
          target_offer: string | null
          title: string | null
          updated_at: string | null
          why_they_matter: string | null
        }
        Insert: {
          background?: string | null
          contact_name: string
          created_at?: string | null
          created_by_id: string
          deal_value?: number | null
          email?: string | null
          hospital_beds?: string | null
          hospital_details?: string | null
          hospital_location?: string | null
          hospital_system?: string | null
          id?: string
          implementation_high?: number | null
          implementation_low?: number | null
          is_active_contract?: boolean
          monthly_price_high?: number | null
          monthly_price_low?: number | null
          notes?: string | null
          organization: string
          phone?: string | null
          profile_image_url?: string | null
          sort_order?: number | null
          status?: string
          strategy_type?: string | null
          target_offer?: string | null
          title?: string | null
          updated_at?: string | null
          why_they_matter?: string | null
        }
        Update: {
          background?: string | null
          contact_name?: string
          created_at?: string | null
          created_by_id?: string
          deal_value?: number | null
          email?: string | null
          hospital_beds?: string | null
          hospital_details?: string | null
          hospital_location?: string | null
          hospital_system?: string | null
          id?: string
          implementation_high?: number | null
          implementation_low?: number | null
          is_active_contract?: boolean
          monthly_price_high?: number | null
          monthly_price_low?: number | null
          notes?: string | null
          organization?: string
          phone?: string | null
          profile_image_url?: string | null
          sort_order?: number | null
          status?: string
          strategy_type?: string | null
          target_offer?: string | null
          title?: string | null
          updated_at?: string | null
          why_they_matter?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_contacts_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          invitation_token: string
          invitee_email: string
          practice_name: string | null
          status: string | null
          team_owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_token: string
          invitee_email: string
          practice_name?: string | null
          status?: string | null
          team_owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invitee_email?: string
          practice_name?: string | null
          status?: string | null
          team_owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_owner_id_fkey"
            columns: ["team_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          cancel_at_period_end: boolean | null
          cases_remaining: number | null
          cases_remaining_this_month: number | null
          cases_used_this_period: number | null
          created_at: string | null
          email: string
          id: string
          is_super_admin: boolean | null
          is_team_owner: boolean | null
          practice_name: string | null
          provider_npi: string | null
          seats_count: number | null
          specialty: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          team_owner_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          cancel_at_period_end?: boolean | null
          cases_remaining?: number | null
          cases_remaining_this_month?: number | null
          cases_used_this_period?: number | null
          created_at?: string | null
          email: string
          id: string
          is_super_admin?: boolean | null
          is_team_owner?: boolean | null
          practice_name?: string | null
          provider_npi?: string | null
          seats_count?: number | null
          specialty?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          team_owner_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          cancel_at_period_end?: boolean | null
          cases_remaining?: number | null
          cases_remaining_this_month?: number | null
          cases_used_this_period?: number | null
          created_at?: string | null
          email?: string
          id?: string
          is_super_admin?: boolean | null
          is_team_owner?: boolean | null
          practice_name?: string | null
          provider_npi?: string | null
          seats_count?: number | null
          specialty?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          team_owner_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_team_owner_id_fkey"
            columns: ["team_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          action: string | null
          api_version: string | null
          created_at: string
          customer_id: string | null
          duration_ms: number | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          invoice_id: string | null
          livemode: boolean | null
          processed_at: string
          skip_reason: string | null
          skipped: boolean | null
          subscription_id: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          action?: string | null
          api_version?: string | null
          created_at?: string
          customer_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          invoice_id?: string | null
          livemode?: boolean | null
          processed_at?: string
          skip_reason?: string | null
          skipped?: boolean | null
          subscription_id?: string | null
          success: boolean
          user_id?: string | null
        }
        Update: {
          action?: string | null
          api_version?: string | null
          created_at?: string
          customer_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          invoice_id?: string | null
          livemode?: boolean | null
          processed_at?: string
          skip_reason?: string | null
          skipped?: boolean | null
          subscription_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: { Args: { token: string }; Returns: Json }
      get_team_members_count: { Args: { owner_id: string }; Returns: number }
      get_user_team_owner_id: { Args: { user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
