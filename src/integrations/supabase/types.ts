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
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          max_uses: number
          percentage: number
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          max_uses?: number
          percentage: number
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          percentage?: number
          uses_count?: number
        }
        Relationships: []
      }
      group_members: {
        Row: {
          created_at: string
          full_name: string
          id: string
          matricule: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          matricule?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          matricule?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          discount_code: string | null
          discount_percentage: number | null
          final_amount: number | null
          id: string
          idea_type: string | null
          method: string
          proof_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          final_amount?: number | null
          id?: string
          idea_type?: string | null
          method: string
          proof_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          final_amount?: number | null
          id?: string
          idea_type?: string | null
          method?: string
          proof_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          full_name: string | null
          id: string
          matricule: string | null
          specialty: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          matricule?: string | null
          specialty?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          matricule?: string | null
          specialty?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          chapters: Json
          created_at: string
          diagram: Json
          id: string
          idea: string
          objectifs: Json
          payment_id: string | null
          plan: Json
          problematique: string
          solution: string
          specialty: string
          survey: Json
          technologies: Json
          title: string
          user_id: string
        }
        Insert: {
          chapters?: Json
          created_at?: string
          diagram?: Json
          id?: string
          idea: string
          objectifs?: Json
          payment_id?: string | null
          plan?: Json
          problematique: string
          solution: string
          specialty: string
          survey?: Json
          technologies?: Json
          title: string
          user_id: string
        }
        Update: {
          chapters?: Json
          created_at?: string
          diagram?: Json
          id?: string
          idea?: string
          objectifs?: Json
          payment_id?: string | null
          plan?: Json
          problematique?: string
          solution?: string
          specialty?: string
          survey?: Json
          technologies?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      payment_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "student"],
      payment_status: ["pending", "approved", "rejected"],
    },
  },
} as const
