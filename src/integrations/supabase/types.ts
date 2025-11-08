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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      architecture_components: {
        Row: {
          color_code: string | null
          component_name: string
          created_at: string | null
          description: string | null
          id: string
          implementation_progress: number | null
          layer_name: string
          related_tasks: string[] | null
          status: string | null
          technology: string | null
          updated_at: string | null
        }
        Insert: {
          color_code?: string | null
          component_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_progress?: number | null
          layer_name: string
          related_tasks?: string[] | null
          status?: string | null
          technology?: string | null
          updated_at?: string | null
        }
        Update: {
          color_code?: string | null
          component_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_progress?: number | null
          layer_name?: string
          related_tasks?: string[] | null
          status?: string | null
          technology?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      geofence_events: {
        Row: {
          accuracy_meters: number | null
          event_type: string
          geofence_id: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          event_type: string
          geofence_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          accuracy_meters?: number | null
          event_type?: string
          geofence_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_metrics: {
        Row: {
          created_at: string | null
          geofence_id: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          timestamp: string
          unit: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          geofence_id?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          timestamp?: string
          unit?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          geofence_id?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          timestamp?: string
          unit?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "geofence_metrics_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          active: boolean | null
          alert_threshold: number | null
          budget_limit: number | null
          center_lat: number
          center_lng: number
          created_at: string | null
          id: string
          name: string
          radius_meters: number
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          alert_threshold?: number | null
          budget_limit?: number | null
          center_lat: number
          center_lng: number
          created_at?: string | null
          id?: string
          name: string
          radius_meters: number
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          alert_threshold?: number | null
          budget_limit?: number | null
          center_lat?: number
          center_lng?: number
          created_at?: string | null
          id?: string
          name?: string
          radius_meters?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          address: string | null
          category: string | null
          id: string
          last_updated: string | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          photo_url: string | null
          place_id: string
          rating: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          id?: string
          last_updated?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          place_id: string
          rating?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          id?: string
          last_updated?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          place_id?: string
          rating?: number | null
          website?: string | null
        }
        Relationships: []
      }
      metrics: {
        Row: {
          id: string
          metric_name: string
          metric_type: string
          target: number | null
          timestamp: string | null
          unit: string | null
          value: number | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_type: string
          target?: number | null
          timestamp?: string | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_type?: string
          target?: number | null
          timestamp?: string | null
          unit?: string | null
          value?: number | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string | null
          date_completed: string | null
          gate_requirements: Json | null
          id: string
          name: string
          phase_id: string | null
          status: string | null
          updated_at: string | null
          week: number
        }
        Insert: {
          created_at?: string | null
          date_completed?: string | null
          gate_requirements?: Json | null
          id?: string
          name: string
          phase_id?: string | null
          status?: string | null
          updated_at?: string | null
          week: number
        }
        Update: {
          created_at?: string | null
          date_completed?: string | null
          gate_requirements?: Json | null
          id?: string
          name?: string
          phase_id?: string | null
          status?: string | null
          updated_at?: string | null
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          created_at: string | null
          dependencies: Json | null
          duration_weeks: number
          end_week: number
          id: string
          name: string
          objective: string | null
          phase_number: number
          progress: number | null
          risk_level: string | null
          start_week: number
          status: string | null
          team_size: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dependencies?: Json | null
          duration_weeks: number
          end_week: number
          id?: string
          name: string
          objective?: string | null
          phase_number: number
          progress?: number | null
          risk_level?: string | null
          start_week: number
          status?: string | null
          team_size?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dependencies?: Json | null
          duration_weeks?: number
          end_week?: number
          id?: string
          name?: string
          objective?: string | null
          phase_number?: number
          progress?: number | null
          risk_level?: string | null
          start_week?: number
          status?: string | null
          team_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_metadata: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      readiness_gates: {
        Row: {
          created_at: string | null
          date_passed: string | null
          id: string
          notes: string | null
          phase_id: string | null
          requirements: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_passed?: string | null
          id?: string
          notes?: string | null
          phase_id?: string | null
          requirements: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_passed?: string | null
          id?: string
          notes?: string | null
          phase_id?: string | null
          requirements?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_gates_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          impact: string | null
          mitigation: string | null
          owner_id: string | null
          probability: string | null
          risk_score: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          mitigation?: string | null
          owner_id?: string | null
          probability?: string | null
          risk_score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          mitigation?: string | null
          owner_id?: string | null
          probability?: string | null
          risk_score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          architecture_components: Json | null
          created_at: string | null
          dependencies: Json | null
          description: string | null
          duration_weeks: number | null
          id: string
          name: string
          owner_id: string | null
          phase_id: string | null
          priority: string | null
          progress: number | null
          start_week: number | null
          status: string | null
          success_criteria: Json | null
          updated_at: string | null
        }
        Insert: {
          architecture_components?: Json | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          name: string
          owner_id?: string | null
          phase_id?: string | null
          priority?: string | null
          progress?: number | null
          start_week?: number | null
          status?: string | null
          success_criteria?: Json | null
          updated_at?: string | null
        }
        Update: {
          architecture_components?: Json | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          name?: string
          owner_id?: string | null
          phase_id?: string | null
          priority?: string | null
          progress?: number | null
          start_week?: number | null
          status?: string | null
          success_criteria?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          capacity_hours: number | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string
          skills: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          capacity_hours?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          skills?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          capacity_hours?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          skills?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          coverage_percent: number | null
          duration_seconds: number | null
          fail_count: number | null
          id: string
          pass_count: number | null
          test_suite: string | null
          test_type: string
          timestamp: string | null
        }
        Insert: {
          coverage_percent?: number | null
          duration_seconds?: number | null
          fail_count?: number | null
          id?: string
          pass_count?: number | null
          test_suite?: string | null
          test_type: string
          timestamp?: string | null
        }
        Update: {
          coverage_percent?: number | null
          duration_seconds?: number | null
          fail_count?: number | null
          id?: string
          pass_count?: number | null
          test_suite?: string | null
          test_type?: string
          timestamp?: string | null
        }
        Relationships: []
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
