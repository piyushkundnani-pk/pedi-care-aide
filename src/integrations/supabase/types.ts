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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      consultations: {
        Row: {
          appointment_status: string
          attach_fever_advisory: boolean
          consult_date: string
          created_at: string
          diagnosis: string | null
          id: string
          patient_id: string
          symptoms: string | null
          user_id: string
        }
        Insert: {
          appointment_status?: string
          attach_fever_advisory?: boolean
          consult_date?: string
          created_at?: string
          diagnosis?: string | null
          id?: string
          patient_id: string
          symptoms?: string | null
          user_id?: string
        }
        Update: {
          appointment_status?: string
          attach_fever_advisory?: boolean
          consult_date?: string
          created_at?: string
          diagnosis?: string | null
          id?: string
          patient_id?: string
          symptoms?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[]
          created_at: string
          date_of_birth: string
          full_name: string
          gender: string | null
          id: string
          parent_name: string | null
          parent_phone: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          allergies?: string[]
          created_at?: string
          date_of_birth: string
          full_name: string
          gender?: string | null
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          user_id?: string
          weight_kg: number
        }
        Update: {
          allergies?: string[]
          created_at?: string
          date_of_birth?: string
          full_name?: string
          gender?: string | null
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          consultation_id: string
          created_at: string
          dosage_mg: number | null
          drug_name: string
          duration_days: number | null
          frequency_per_day: number | null
          id: string
          user_id: string
          whatsapp_read_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string
          dosage_mg?: number | null
          drug_name: string
          duration_days?: number | null
          frequency_per_day?: number | null
          id?: string
          user_id?: string
          whatsapp_read_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string
          dosage_mg?: number | null
          drug_name?: string
          duration_days?: number | null
          frequency_per_day?: number | null
          id?: string
          user_id?: string
          whatsapp_read_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_records: {
        Row: {
          administered_date: string | null
          created_at: string
          id: string
          patient_id: string
          reminder_sent_at: string | null
          scheduled_date: string
          status: string
          user_id: string
          vaccine_name: string
        }
        Insert: {
          administered_date?: string | null
          created_at?: string
          id?: string
          patient_id: string
          reminder_sent_at?: string | null
          scheduled_date: string
          status?: string
          user_id?: string
          vaccine_name: string
        }
        Update: {
          administered_date?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          reminder_sent_at?: string | null
          scheduled_date?: string
          status?: string
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
