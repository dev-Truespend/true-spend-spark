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
      ab_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          experiment_name: string
          id: string
          minimum_sample_size: number | null
          start_date: string
          status: string
          target_metric: string
          traffic_allocation: Json
          updated_at: string
          variants: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          experiment_name: string
          id?: string
          minimum_sample_size?: number | null
          start_date: string
          status?: string
          target_metric: string
          traffic_allocation: Json
          updated_at?: string
          variants: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          experiment_name?: string
          id?: string
          minimum_sample_size?: number | null
          start_date?: string
          status?: string
          target_metric?: string
          traffic_allocation?: Json
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_rule_id: string | null
          channel: string
          error_message: string | null
          id: string
          incident_id: string | null
          metadata: Json | null
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_rule_id?: string | null
          channel: string
          error_message?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_rule_id?: string | null
          channel?: string
          error_message?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_history_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_retry_queue: {
        Row: {
          alert_history_id: string
          created_at: string
          id: string
          incident_id: string | null
          last_error: string | null
          max_retries: number
          metadata: Json | null
          next_retry_at: string
          retry_count: number
          updated_at: string
        }
        Insert: {
          alert_history_id: string
          created_at?: string
          id?: string
          incident_id?: string | null
          last_error?: string | null
          max_retries?: number
          metadata?: Json | null
          next_retry_at: string
          retry_count?: number
          updated_at?: string
        }
        Update: {
          alert_history_id?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          last_error?: string | null
          max_retries?: number
          metadata?: Json | null
          next_retry_at?: string
          retry_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_retry_queue_alert_history_id_fkey"
            columns: ["alert_history_id"]
            isOneToOne: false
            referencedRelation: "alert_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_retry_queue_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          active: boolean | null
          channels: string[]
          created_at: string | null
          escalation_timeout_minutes: number | null
          id: string
          name: string
          severity: string
          trigger_conditions: Json | null
          updated_at: string | null
          user_ids: string[]
        }
        Insert: {
          active?: boolean | null
          channels?: string[]
          created_at?: string | null
          escalation_timeout_minutes?: number | null
          id?: string
          name: string
          severity: string
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_ids?: string[]
        }
        Update: {
          active?: boolean | null
          channels?: string[]
          created_at?: string | null
          escalation_timeout_minutes?: number | null
          id?: string
          name?: string
          severity?: string
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_ids?: string[]
        }
        Relationships: []
      }
      anomaly_detections: {
        Row: {
          anomaly_type: string
          confidence_score: number | null
          created_at: string
          details: Json | null
          detected_at: string
          id: string
          reviewed_at: string | null
          severity: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          anomaly_type: string
          confidence_score?: number | null
          created_at?: string
          details?: Json | null
          detected_at?: string
          id?: string
          reviewed_at?: string | null
          severity: string
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          anomaly_type?: string
          confidence_score?: number | null
          created_at?: string
          details?: Json | null
          detected_at?: string
          id?: string
          reviewed_at?: string | null
          severity?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_detections_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_log: {
        Row: {
          cache_hit: boolean | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          method: string
          payload_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          method?: string
          payload_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          payload_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      auth_attempts: {
        Row: {
          attempt_type: string
          created_at: string
          endpoint: string | null
          id: string
          identifier: string | null
          ip_address: string
          ip_address_hash: string | null
          metadata: Json | null
          success: boolean
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string
          endpoint?: string | null
          id?: string
          identifier?: string | null
          ip_address: string
          ip_address_hash?: string | null
          metadata?: Json | null
          success?: boolean
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          endpoint?: string | null
          id?: string
          identifier?: string | null
          ip_address?: string
          ip_address_hash?: string | null
          metadata?: Json | null
          success?: boolean
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      auth_identities: {
        Row: {
          created_at: string
          id: string
          last_sign_in_at: string | null
          provider: string
          provider_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sign_in_at?: string | null
          provider: string
          provider_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sign_in_at?: string | null
          provider?: string
          provider_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_status: {
        Row: {
          backup_timestamp: string
          backup_type: string
          created_at: string | null
          error_message: string | null
          id: string
          size_bytes: number | null
          status: string
          verification_status: string | null
        }
        Insert: {
          backup_timestamp: string
          backup_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          size_bytes?: number | null
          status: string
          verification_status?: string | null
        }
        Update: {
          backup_timestamp?: string
          backup_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          size_bytes?: number | null
          status?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      budget_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          budget_id: string
          budget_limit: number
          created_at: string
          current_spent: number
          id: string
          threshold_percentage: number
          triggered_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          budget_id: string
          budget_limit: number
          created_at?: string
          current_spent: number
          id?: string
          threshold_percentage: number
          triggered_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          budget_id?: string
          budget_limit?: number
          created_at?: string
          current_spent?: number
          id?: string
          threshold_percentage?: number
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_optimization_history: {
        Row: {
          actual_spent: number | null
          allocated_amount: number
          alpha_param: number
          beta_param: number
          category: string
          confidence_score: number
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_spent?: number | null
          allocated_amount: number
          alpha_param: number
          beta_param: number
          category: string
          confidence_score: number
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_spent?: number | null
          allocated_amount?: number
          alpha_param?: number
          beta_param?: number
          category?: string
          confidence_score?: number
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          active: boolean | null
          alert_threshold: number | null
          category: string
          created_at: string | null
          end_date: string | null
          geofence_id: string | null
          id: string
          limit_amount: number
          period: string
          start_date: string
          synced: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          alert_threshold?: number | null
          category: string
          created_at?: string | null
          end_date?: string | null
          geofence_id?: string | null
          id?: string
          limit_amount: number
          period: string
          start_date: string
          synced?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          alert_threshold?: number | null
          category?: string
          created_at?: string | null
          end_date?: string | null
          geofence_id?: string | null
          id?: string
          limit_amount?: number
          period?: string
          start_date?: string
          synced?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_analytics: {
        Row: {
          cache_type: string
          geohash: string | null
          id: string
          metadata: Json | null
          operation: string
          response_time_ms: number | null
          saved_api_cost_usd: number | null
          timestamp: string
        }
        Insert: {
          cache_type: string
          geohash?: string | null
          id?: string
          metadata?: Json | null
          operation: string
          response_time_ms?: number | null
          saved_api_cost_usd?: number | null
          timestamp?: string
        }
        Update: {
          cache_type?: string
          geohash?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          response_time_ms?: number | null
          saved_api_cost_usd?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      consent_audit_log: {
        Row: {
          action: string
          changed_fields: Json | null
          consent_id: string
          id: string
          ip_address: string | null
          new_values: Json | null
          previous_values: Json | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          consent_id: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          previous_values?: Json | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          consent_id?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          previous_values?: Json | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_audit_log_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "user_consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string
          account_mask: string | null
          account_name: string | null
          apr_percentage: number | null
          available_credit: number | null
          card_brand: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          due_date: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_sync_at: string | null
          minimum_payment: number | null
          plaid_item_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_mask?: string | null
          account_name?: string | null
          apr_percentage?: number | null
          available_credit?: number | null
          card_brand?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          minimum_payment?: number | null
          plaid_item_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_mask?: string | null
          account_name?: string | null
          apr_percentage?: number | null
          available_credit?: number | null
          card_brand?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          minimum_payment?: number | null
          plaid_item_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      csp_violations: {
        Row: {
          blocked_uri: string | null
          column_number: number | null
          document_uri: string
          id: string
          line_number: number | null
          source_file: string | null
          timestamp: string | null
          user_agent: string | null
          violated_directive: string
        }
        Insert: {
          blocked_uri?: string | null
          column_number?: number | null
          document_uri: string
          id?: string
          line_number?: number | null
          source_file?: string | null
          timestamp?: string | null
          user_agent?: string | null
          violated_directive: string
        }
        Update: {
          blocked_uri?: string | null
          column_number?: number | null
          document_uri?: string
          id?: string
          line_number?: number | null
          source_file?: string | null
          timestamp?: string | null
          user_agent?: string | null
          violated_directive?: string
        }
        Relationships: []
      }
      data_access_audit: {
        Row: {
          accessed_fields: Json | null
          id: string
          ip_address_hash: string | null
          operation: string
          row_id: string | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accessed_fields?: Json | null
          id?: string
          ip_address_hash?: string | null
          operation: string
          row_id?: string | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_fields?: Json | null
          id?: string
          ip_address_hash?: string | null
          operation?: string
          row_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_access_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      dead_letter_queue: {
        Row: {
          created_at: string | null
          failure_reason: string
          id: string
          manual_review_required: boolean | null
          original_queue_type: string
          payload: Json
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          retry_history: Json | null
        }
        Insert: {
          created_at?: string | null
          failure_reason: string
          id?: string
          manual_review_required?: boolean | null
          original_queue_type: string
          payload: Json
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_history?: Json | null
        }
        Update: {
          created_at?: string | null
          failure_reason?: string
          id?: string
          manual_review_required?: boolean | null
          original_queue_type?: string
          payload?: Json
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dead_letter_queue_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dead_letter_queue_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          frequency: string | null
          preferred_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string | null
          preferred_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string | null
          preferred_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          complained_at: string | null
          created_at: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          resend_message_id: string | null
          retry_count: number | null
          scheduled_send_time: string | null
          send_status: string | null
          sent_at: string | null
          status: string | null
          template_name: string | null
          template_version: string | null
          user_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          resend_message_id?: string | null
          retry_count?: number | null
          scheduled_send_time?: string | null
          send_status?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_version?: string | null
          user_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          resend_message_id?: string | null
          retry_count?: number | null
          scheduled_send_time?: string | null
          send_status?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_version?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      email_rate_limits: {
        Row: {
          attempt_count: number
          created_at: string
          email: string | null
          email_hash: string | null
          last_attempt_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email?: string | null
          email_hash?: string | null
          last_attempt_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string | null
          email_hash?: string | null
          last_attempt_at?: string
          window_start?: string
        }
        Relationships: []
      }
      event_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_payload: Json
          event_type: string
          id: string
          max_retries: number | null
          metadata: Json | null
          processed_at: string | null
          retry_count: number | null
          scheduled_for: string | null
          status: string | null
          topic: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_payload: Json
          event_type: string
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: string | null
          topic: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: string | null
          topic?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      experiment_metrics: {
        Row: {
          experiment_id: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number | null
          recorded_at: string
          user_id: string
          variant: string
        }
        Insert: {
          experiment_id: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value?: number | null
          recorded_at?: string
          user_id: string
          variant: string
        }
        Update: {
          experiment_id?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number | null
          recorded_at?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_metrics_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_telemetry: {
        Row: {
          created_at: string | null
          event_type: string
          extension_version: string | null
          id: string
          properties: Json | null
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          extension_version?: string | null
          id?: string
          properties?: Json | null
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          extension_version?: string | null
          id?: string
          properties?: Json | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_telemetry_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_telemetry_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_audit: {
        Row: {
          action: string
          flag_id: string | null
          id: string
          metadata: Json | null
          new_state: Json | null
          previous_state: Json | null
          result: boolean | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          flag_id?: string | null
          id?: string
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          result?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          flag_id?: string | null
          id?: string
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          result?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          dependencies: Json | null
          enabled: boolean
          environment: string | null
          flag_name: string
          id: string
          metadata: Json | null
          rollout_percentage: number | null
          target_roles: string[] | null
          target_users: string[] | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          dependencies?: Json | null
          enabled?: boolean
          environment?: string | null
          flag_name: string
          id?: string
          metadata?: Json | null
          rollout_percentage?: number | null
          target_roles?: string[] | null
          target_users?: string[] | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          dependencies?: Json | null
          enabled?: boolean
          environment?: string | null
          flag_name?: string
          id?: string
          metadata?: Json | null
          rollout_percentage?: number | null
          target_roles?: string[] | null
          target_users?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      foursquare_api_logs: {
        Row: {
          cache_hit: boolean | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          request_params: Json | null
          response_status: number | null
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          request_params?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          request_params?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      foursquare_categories: {
        Row: {
          category_id: number
          category_name: string
          created_at: string | null
          icon_prefix: string | null
          icon_suffix: string | null
          id: string
          level: number | null
          metadata: Json | null
          parent_category_id: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: number
          category_name: string
          created_at?: string | null
          icon_prefix?: string | null
          icon_suffix?: string | null
          id?: string
          level?: number | null
          metadata?: Json | null
          parent_category_id?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: number
          category_name?: string
          created_at?: string | null
          icon_prefix?: string | null
          icon_suffix?: string | null
          id?: string
          level?: number | null
          metadata?: Json | null
          parent_category_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      foursquare_places: {
        Row: {
          categories: Json | null
          chains: Json | null
          created_at: string | null
          fsq_id: string
          geocodes: Json | null
          hours: Json | null
          id: string
          last_verified_at: string | null
          location: Json | null
          metadata: Json | null
          name: string
          popularity: number | null
          price_tier: number | null
          primary_category: string | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          categories?: Json | null
          chains?: Json | null
          created_at?: string | null
          fsq_id: string
          geocodes?: Json | null
          hours?: Json | null
          id?: string
          last_verified_at?: string | null
          location?: Json | null
          metadata?: Json | null
          name: string
          popularity?: number | null
          price_tier?: number | null
          primary_category?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          categories?: Json | null
          chains?: Json | null
          created_at?: string | null
          fsq_id?: string
          geocodes?: Json | null
          hours?: Json | null
          id?: string
          last_verified_at?: string | null
          location?: Json | null
          metadata?: Json | null
          name?: string
          popularity?: number | null
          price_tier?: number | null
          primary_category?: string | null
          rating?: number | null
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
          location_token: string | null
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
          location_token?: string | null
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
          location_token?: string | null
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
      geofence_heatmap_data: {
        Row: {
          amount_spent: number | null
          category: string | null
          id: string
          intensity: number
          lat: number
          lng: number
          period_end: string
          period_start: string
          timestamp: string
          transaction_count: number | null
          user_id: string
        }
        Insert: {
          amount_spent?: number | null
          category?: string | null
          id?: string
          intensity: number
          lat: number
          lng: number
          period_end: string
          period_start: string
          timestamp?: string
          transaction_count?: number | null
          user_id: string
        }
        Update: {
          amount_spent?: number | null
          category?: string | null
          id?: string
          intensity?: number
          lat?: number
          lng?: number
          period_end?: string
          period_start?: string
          timestamp?: string
          transaction_count?: number | null
          user_id?: string
        }
        Relationships: []
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
      geofence_suggestions: {
        Row: {
          center_lat: number
          center_lng: number
          cluster_id: number
          confidence_score: number
          created_at: string | null
          id: string
          radius_meters: number
          status: string | null
          top_categories: Json | null
          total_spent: number | null
          transaction_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          cluster_id: number
          confidence_score: number
          created_at?: string | null
          id?: string
          radius_meters: number
          status?: string | null
          top_categories?: Json | null
          total_spent?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          cluster_id?: number
          confidence_score?: number
          created_at?: string | null
          id?: string
          radius_meters?: number
          status?: string | null
          top_categories?: Json | null
          total_spent?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      geofences: {
        Row: {
          active: boolean | null
          alert_threshold: number | null
          budget_limit: number | null
          center_lat: number
          center_lng: number
          created_at: string | null
          formatted_address: string | null
          google_place_data: Json | null
          id: string
          name: string
          place_id: string | null
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
          formatted_address?: string | null
          google_place_data?: Json | null
          id?: string
          name: string
          place_id?: string | null
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
          formatted_address?: string | null
          google_place_data?: Json | null
          id?: string
          name?: string
          place_id?: string | null
          radius_meters?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_maps_api_logs: {
        Row: {
          api_type: string
          cache_hit: boolean | null
          cost_usd: number | null
          created_at: string | null
          endpoint: string
          id: string
          request_params: Json | null
          response_status: number | null
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          api_type: string
          cache_hit?: boolean | null
          cost_usd?: number | null
          created_at?: string | null
          endpoint: string
          id?: string
          request_params?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          api_type?: string
          cache_hit?: boolean | null
          cost_usd?: number | null
          created_at?: string | null
          endpoint?: string
          id?: string
          request_params?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_maps_api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_maps_api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      google_maps_geocode_cache: {
        Row: {
          address: string | null
          cached_at: string | null
          components: Json | null
          expires_at: string | null
          formatted_address: string | null
          hit_count: number | null
          id: string
          lat: number | null
          lng: number | null
          place_id: string | null
          query_hash: string
        }
        Insert: {
          address?: string | null
          cached_at?: string | null
          components?: Json | null
          expires_at?: string | null
          formatted_address?: string | null
          hit_count?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          place_id?: string | null
          query_hash: string
        }
        Update: {
          address?: string | null
          cached_at?: string | null
          components?: Json | null
          expires_at?: string | null
          formatted_address?: string | null
          hit_count?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          place_id?: string | null
          query_hash?: string
        }
        Relationships: []
      }
      google_places_cache: {
        Row: {
          cached_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          place_data: Json
          place_id: string
        }
        Insert: {
          cached_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          place_data: Json
          place_id: string
        }
        Update: {
          cached_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          place_data?: Json
          place_id?: string
        }
        Relationships: []
      }
      google_vision_cost_tracking: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          request_count: number | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          request_count?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          request_count?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      incident_alerts: {
        Row: {
          channel: string
          id: string
          incident_id: string
          recipient: string | null
          sent_at: string
          status: string
        }
        Insert: {
          channel: string
          id?: string
          incident_id: string
          recipient?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          channel?: string
          id?: string
          incident_id?: string
          recipient?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_services: string[] | null
          auto_detected: boolean | null
          description: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          started_at: string
          status: string
          title: string
        }
        Insert: {
          affected_services?: string[] | null
          auto_detected?: boolean | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          started_at?: string
          status?: string
          title: string
        }
        Update: {
          affected_services?: string[] | null
          auto_detected?: boolean | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      location_analytics: {
        Row: {
          average_transaction: number | null
          budget_adherence_score: number | null
          created_at: string
          geofence_id: string | null
          id: string
          period_end: string
          period_start: string
          spending_trend: string | null
          top_categories: Json | null
          top_merchants: Json | null
          total_spent: number | null
          total_visits: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_transaction?: number | null
          budget_adherence_score?: number | null
          created_at?: string
          geofence_id?: string | null
          id?: string
          period_end: string
          period_start: string
          spending_trend?: string | null
          top_categories?: Json | null
          top_merchants?: Json | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_transaction?: number | null
          budget_adherence_score?: number | null
          created_at?: string
          geofence_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
          spending_trend?: string | null
          top_categories?: Json | null
          top_merchants?: Json | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_analytics_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      location_insights: {
        Row: {
          actioned: boolean | null
          actioned_at: string | null
          confidence_score: number | null
          created_at: string
          description: string
          expires_at: string | null
          geofence_id: string | null
          id: string
          insight_type: string
          metadata: Json | null
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          actioned?: boolean | null
          actioned_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          expires_at?: string | null
          geofence_id?: string | null
          id?: string
          insight_type: string
          metadata?: Json | null
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          actioned?: boolean | null
          actioned_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          expires_at?: string | null
          geofence_id?: string | null
          id?: string
          insight_type?: string
          metadata?: Json | null
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_insights_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      location_recommendations: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          created_at: string
          current_value: number | null
          data_points_analyzed: number | null
          expires_at: string | null
          geofence_id: string | null
          id: string
          potential_savings: number | null
          rationale: string
          recommendation_type: string
          recommended_value: number | null
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          created_at?: string
          current_value?: number | null
          data_points_analyzed?: number | null
          expires_at?: string | null
          geofence_id?: string | null
          id?: string
          potential_savings?: number | null
          rationale: string
          recommendation_type: string
          recommended_value?: number | null
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          created_at?: string
          current_value?: number | null
          data_points_analyzed?: number | null
          expires_at?: string | null
          geofence_id?: string | null
          id?: string
          potential_savings?: number | null
          rationale?: string
          recommendation_type?: string
          recommended_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_recommendations_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_foursquare_mapping: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          fsq_id: string
          id: string
          match_method: string | null
          merchant_id: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          fsq_id: string
          id?: string
          match_method?: string | null
          merchant_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          fsq_id?: string
          id?: string
          match_method?: string | null
          merchant_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_foursquare_mapping_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_recommendations: {
        Row: {
          clicked: boolean | null
          clicked_at: string | null
          confidence_score: number | null
          converted: boolean | null
          converted_at: string | null
          created_at: string
          deal_description: string | null
          deal_type: string | null
          expires_at: string | null
          geofence_id: string | null
          id: string
          merchant_id: string | null
          potential_savings: number | null
          recommendation_reason: string
          user_id: string
          viewed: boolean | null
          viewed_at: string | null
        }
        Insert: {
          clicked?: boolean | null
          clicked_at?: string | null
          confidence_score?: number | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          deal_description?: string | null
          deal_type?: string | null
          expires_at?: string | null
          geofence_id?: string | null
          id?: string
          merchant_id?: string | null
          potential_savings?: number | null
          recommendation_reason: string
          user_id: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Update: {
          clicked?: boolean | null
          clicked_at?: string | null
          confidence_score?: number | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          deal_description?: string | null
          deal_type?: string | null
          expires_at?: string | null
          geofence_id?: string | null
          id?: string
          merchant_id?: string | null
          potential_savings?: number | null
          recommendation_reason?: string
          user_id?: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_recommendations_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_recommendations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          category: string | null
          chain_name: string | null
          foursquare_verified: boolean | null
          fsq_id: string | null
          id: string
          last_foursquare_sync: string | null
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
          chain_name?: string | null
          foursquare_verified?: boolean | null
          fsq_id?: string | null
          id?: string
          last_foursquare_sync?: string | null
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
          chain_name?: string | null
          foursquare_verified?: boolean | null
          fsq_id?: string | null
          id?: string
          last_foursquare_sync?: string | null
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
      merchants_cache_v2: {
        Row: {
          cached_at: string
          categories: string[] | null
          expires_at: string
          geohash: string
          geohash_precision: number
          hit_count: number | null
          id: string
          last_accessed: string | null
          lat: number
          lng: number
          merchant_data: Json
          price_tier: number | null
          rating: number | null
          source: string
        }
        Insert: {
          cached_at?: string
          categories?: string[] | null
          expires_at?: string
          geohash: string
          geohash_precision?: number
          hit_count?: number | null
          id?: string
          last_accessed?: string | null
          lat: number
          lng: number
          merchant_data: Json
          price_tier?: number | null
          rating?: number | null
          source: string
        }
        Update: {
          cached_at?: string
          categories?: string[] | null
          expires_at?: string
          geohash?: string
          geohash_precision?: number
          hit_count?: number | null
          id?: string
          last_accessed?: string | null
          lat?: number
          lng?: number
          merchant_data?: Json
          price_tier?: number | null
          rating?: number | null
          source?: string
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
      mfa_backup_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_settings: {
        Row: {
          backup_codes_generated: boolean | null
          created_at: string | null
          enabled_at: string | null
          failed_login_attempts: number | null
          failed_mfa_attempts: number | null
          id: string
          last_verified_at: string | null
          login_lock_until: string | null
          mfa_lock_until: string | null
          pending_mfa_secret: string | null
          totp_enabled: boolean | null
          totp_secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes_generated?: boolean | null
          created_at?: string | null
          enabled_at?: string | null
          failed_login_attempts?: number | null
          failed_mfa_attempts?: number | null
          id?: string
          last_verified_at?: string | null
          login_lock_until?: string | null
          mfa_lock_until?: string | null
          pending_mfa_secret?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes_generated?: boolean | null
          created_at?: string | null
          enabled_at?: string | null
          failed_login_attempts?: number | null
          failed_mfa_attempts?: number | null
          id?: string
          last_verified_at?: string | null
          login_lock_until?: string | null
          mfa_lock_until?: string | null
          pending_mfa_secret?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id?: string
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
      ml_ab_tests: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          metrics: Json | null
          model_a_id: string
          model_b_id: string
          started_at: string | null
          status: string | null
          test_name: string
          traffic_split: number | null
          updated_at: string | null
          winner: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          metrics?: Json | null
          model_a_id: string
          model_b_id: string
          started_at?: string | null
          status?: string | null
          test_name: string
          traffic_split?: number | null
          updated_at?: string | null
          winner?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          metrics?: Json | null
          model_a_id?: string
          model_b_id?: string
          started_at?: string | null
          status?: string | null
          test_name?: string
          traffic_split?: number | null
          updated_at?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      ml_model_registry: {
        Row: {
          artifact_url: string
          created_at: string | null
          deployed_at: string | null
          hyperparameters: Json | null
          id: string
          metrics: Json | null
          model_id: string
          model_type: string
          production_deployed: boolean | null
          shadow_deployed: boolean | null
          shadow_deployed_at: string | null
          shadow_traffic_split: number | null
          status: string
          storage_bucket: string | null
          storage_path: string | null
          trained_at: string | null
          training_config: Json | null
          training_duration_seconds: number | null
          training_samples_count: number | null
          updated_at: string | null
          version: string
        }
        Insert: {
          artifact_url: string
          created_at?: string | null
          deployed_at?: string | null
          hyperparameters?: Json | null
          id?: string
          metrics?: Json | null
          model_id: string
          model_type: string
          production_deployed?: boolean | null
          shadow_deployed?: boolean | null
          shadow_deployed_at?: string | null
          shadow_traffic_split?: number | null
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          trained_at?: string | null
          training_config?: Json | null
          training_duration_seconds?: number | null
          training_samples_count?: number | null
          updated_at?: string | null
          version: string
        }
        Update: {
          artifact_url?: string
          created_at?: string | null
          deployed_at?: string | null
          hyperparameters?: Json | null
          id?: string
          metrics?: Json | null
          model_id?: string
          model_type?: string
          production_deployed?: boolean | null
          shadow_deployed?: boolean | null
          shadow_deployed_at?: string | null
          shadow_traffic_split?: number | null
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          trained_at?: string | null
          training_config?: Json | null
          training_duration_seconds?: number | null
          training_samples_count?: number | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          inference_time_ms: number | null
          input_data: Json
          model_id: string
          prediction: Json
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          inference_time_ms?: number | null
          input_data: Json
          model_id: string
          prediction: Json
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          inference_time_ms?: number | null
          input_data?: Json
          model_id?: string
          prediction?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      ml_training_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          logs_url: string | null
          modal_job_id: string | null
          model_type: string
          resulting_model_id: string | null
          started_at: string | null
          status: string
          training_data_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          logs_url?: string | null
          modal_job_id?: string | null
          model_type: string
          resulting_model_id?: string | null
          started_at?: string | null
          status?: string
          training_data_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          logs_url?: string | null
          modal_job_id?: string | null
          model_type?: string
          resulting_model_id?: string | null
          started_at?: string | null
          status?: string
          training_data_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_training_jobs_resulting_model_id_fkey"
            columns: ["resulting_model_id"]
            isOneToOne: false
            referencedRelation: "ml_model_registry"
            referencedColumns: ["model_id"]
          },
        ]
      }
      notification_categories: {
        Row: {
          category_description: string | null
          category_name: string
          color: string | null
          created_at: string | null
          default_enabled: boolean | null
          default_sound: boolean | null
          default_vibrate: boolean | null
          icon: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          category_description?: string | null
          category_name: string
          color?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          default_sound?: boolean | null
          default_vibrate?: boolean | null
          icon?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          category_description?: string | null
          category_name?: string
          color?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          default_sound?: boolean | null
          default_vibrate?: boolean | null
          icon?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_delivery_status: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          fcm_message_id: string | null
          id: string
          notification_id: string | null
          opened_at: string | null
          platform: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          fcm_message_id?: string | null
          id?: string
          notification_id?: string | null
          opened_at?: string | null
          platform?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          fcm_message_id?: string | null
          id?: string
          notification_id?: string | null
          opened_at?: string | null
          platform?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          budget_alert_threshold: number | null
          created_at: string | null
          email_budget_alerts: boolean | null
          email_enabled: boolean | null
          email_geofence_entry: boolean | null
          email_geofence_exit: boolean | null
          email_security_alerts: boolean | null
          email_transaction_alerts: boolean | null
          email_weekly_summary: boolean | null
          id: string
          push_budget_alerts: boolean | null
          push_enabled: boolean | null
          push_geofence_entry: boolean | null
          push_geofence_exit: boolean | null
          push_transaction_alerts: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_budget_alerts: boolean | null
          sms_enabled: boolean | null
          sms_geofence_entry: boolean | null
          sms_security_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_alert_threshold?: number | null
          created_at?: string | null
          email_budget_alerts?: boolean | null
          email_enabled?: boolean | null
          email_geofence_entry?: boolean | null
          email_geofence_exit?: boolean | null
          email_security_alerts?: boolean | null
          email_transaction_alerts?: boolean | null
          email_weekly_summary?: boolean | null
          id?: string
          push_budget_alerts?: boolean | null
          push_enabled?: boolean | null
          push_geofence_entry?: boolean | null
          push_geofence_exit?: boolean | null
          push_transaction_alerts?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_budget_alerts?: boolean | null
          sms_enabled?: boolean | null
          sms_geofence_entry?: boolean | null
          sms_security_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget_alert_threshold?: number | null
          created_at?: string | null
          email_budget_alerts?: boolean | null
          email_enabled?: boolean | null
          email_geofence_entry?: boolean | null
          email_geofence_exit?: boolean | null
          email_security_alerts?: boolean | null
          email_transaction_alerts?: boolean | null
          email_weekly_summary?: boolean | null
          id?: string
          push_budget_alerts?: boolean | null
          push_enabled?: boolean | null
          push_geofence_entry?: boolean | null
          push_geofence_exit?: boolean | null
          push_transaction_alerts?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_budget_alerts?: boolean | null
          sms_enabled?: boolean | null
          sms_geofence_entry?: boolean | null
          sms_security_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          body: string
          category: string
          created_at: string | null
          data: Json | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          scheduled_for: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          body: string
          category: string
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          body?: string
          category?: string
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ocr_abuse_tracking: {
        Row: {
          anomaly_score: number
          blocked_until: string | null
          created_at: string | null
          first_seen: string
          id: string
          ip_address_hash: string
          last_seen: string
          request_count: number
          suspicious_patterns: Json | null
          user_id: string | null
        }
        Insert: {
          anomaly_score?: number
          blocked_until?: string | null
          created_at?: string | null
          first_seen?: string
          id?: string
          ip_address_hash: string
          last_seen?: string
          request_count?: number
          suspicious_patterns?: Json | null
          user_id?: string | null
        }
        Update: {
          anomaly_score?: number
          blocked_until?: string | null
          created_at?: string | null
          first_seen?: string
          id?: string
          ip_address_hash?: string
          last_seen?: string
          request_count?: number
          suspicious_patterns?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ocr_anomaly_patterns: {
        Row: {
          created_at: string | null
          detection_time: string
          id: string
          pattern_data: Json
          pattern_type: string
          resolved: boolean
          resolved_at: string | null
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detection_time?: string
          id?: string
          pattern_data: Json
          pattern_type: string
          resolved?: boolean
          resolved_at?: string | null
          severity: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          detection_time?: string
          id?: string
          pattern_data?: Json
          pattern_type?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_batch_analytics: {
        Row: {
          avg_processing_time_ms: number | null
          batch_id: string
          completed_at: string | null
          created_at: string | null
          failed_items: number
          id: string
          started_at: string
          successful_items: number
          total_cost_usd: number
          total_items: number
          user_id: string
        }
        Insert: {
          avg_processing_time_ms?: number | null
          batch_id: string
          completed_at?: string | null
          created_at?: string | null
          failed_items?: number
          id?: string
          started_at: string
          successful_items?: number
          total_cost_usd?: number
          total_items: number
          user_id: string
        }
        Update: {
          avg_processing_time_ms?: number | null
          batch_id?: string
          completed_at?: string | null
          created_at?: string | null
          failed_items?: number
          id?: string
          started_at?: string
          successful_items?: number
          total_cost_usd?: number
          total_items?: number
          user_id?: string
        }
        Relationships: []
      }
      ocr_processing_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          image_url: string
          max_retries: number
          priority: number
          processing_completed_at: string | null
          processing_started_at: string | null
          result: Json | null
          retry_count: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          image_url: string
          max_retries?: number
          priority?: number
          processing_completed_at?: string | null
          processing_started_at?: string | null
          result?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          image_url?: string
          max_retries?: number
          priority?: number
          processing_completed_at?: string | null
          processing_started_at?: string | null
          result?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ocr_request_signatures: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          signature_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          signature_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          signature_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          ip_address_hash: string | null
          token: string
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          ip_address_hash?: string | null
          token: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          ip_address_hash?: string | null
          token?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      phase_tests: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          phase_id: string | null
          status: string
          test_category: string
          test_name: string
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          phase_id?: string | null
          status: string
          test_category: string
          test_name: string
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          phase_id?: string | null
          status?: string
          test_category?: string
          test_name?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_tests_phase_id_fkey"
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
          story_points: number | null
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
          story_points?: number | null
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
          story_points?: number | null
          team_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      place_enrichment_cache: {
        Row: {
          cached_at: string | null
          created_at: string | null
          enrichment_type: string
          expires_at: string | null
          fsq_id: string
          hit_count: number | null
          id: string
          place_data: Json
        }
        Insert: {
          cached_at?: string | null
          created_at?: string | null
          enrichment_type: string
          expires_at?: string | null
          fsq_id: string
          hit_count?: number | null
          id?: string
          place_data: Json
        }
        Update: {
          cached_at?: string | null
          created_at?: string | null
          enrichment_type?: string
          expires_at?: string | null
          fsq_id?: string
          hit_count?: number | null
          id?: string
          place_data?: Json
        }
        Relationships: []
      }
      plaid_items: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          error_message: string | null
          id: string
          institution_id: string | null
          institution_name: string | null
          item_id: string
          last_sync_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id: string
          last_sync_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id?: string
          last_sync_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_features: {
        Row: {
          category: string | null
          created_at: string | null
          feature_description: string | null
          feature_name: string
          icon: string | null
          id: string
          phase_id: string | null
          platform: string
          priority: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          feature_description?: string | null
          feature_name: string
          icon?: string | null
          id?: string
          phase_id?: string | null
          platform: string
          priority?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          feature_description?: string | null
          feature_name?: string
          icon?: string | null
          id?: string
          phase_id?: string | null
          platform?: string
          priority?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_features_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      previous_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          replaced_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          replaced_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          replaced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "previous_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previous_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: string | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          email_change_expires_at: string | null
          email_change_token: string | null
          email_encrypted: string | null
          email_hash: string | null
          email_verified_at: string | null
          first_name: string | null
          first_name_encrypted: string | null
          full_name: string | null
          id: string
          last_name: string | null
          last_name_encrypted: string | null
          pending_new_email: string | null
          pending_new_email_encrypted: string | null
          pending_new_email_hash: string | null
          phone: string | null
          phone_encrypted: string | null
          phone_hash: string | null
          provider_user_id: string | null
          status: string
          updated_at: string
          verification_expires_at: string | null
          verification_token: string | null
        }
        Insert: {
          auth_provider?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          email_change_expires_at?: string | null
          email_change_token?: string | null
          email_encrypted?: string | null
          email_hash?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          first_name_encrypted?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          last_name_encrypted?: string | null
          pending_new_email?: string | null
          pending_new_email_encrypted?: string | null
          pending_new_email_hash?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          phone_hash?: string | null
          provider_user_id?: string | null
          status?: string
          updated_at?: string
          verification_expires_at?: string | null
          verification_token?: string | null
        }
        Update: {
          auth_provider?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          email_change_expires_at?: string | null
          email_change_token?: string | null
          email_encrypted?: string | null
          email_hash?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          first_name_encrypted?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          last_name_encrypted?: string | null
          pending_new_email?: string | null
          pending_new_email_encrypted?: string | null
          pending_new_email_hash?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          phone_hash?: string | null
          provider_user_id?: string | null
          status?: string
          updated_at?: string
          verification_expires_at?: string | null
          verification_token?: string | null
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
      push_notification_logs: {
        Row: {
          body: string
          data: Json | null
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_size_seconds: number
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_size_seconds?: number
          window_start: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_size_seconds?: number
          window_start?: string
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
      replica_metrics: {
        Row: {
          avg_primary_latency: number | null
          avg_replica_latency: number | null
          connection_type: string | null
          failover_count: number | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          primary_query_count: number | null
          query_type: string | null
          replica_healthy: boolean | null
          replica_lag_ms: number | null
          replica_query_count: number | null
          timestamp: string
        }
        Insert: {
          avg_primary_latency?: number | null
          avg_replica_latency?: number | null
          connection_type?: string | null
          failover_count?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          primary_query_count?: number | null
          query_type?: string | null
          replica_healthy?: boolean | null
          replica_lag_ms?: number | null
          replica_query_count?: number | null
          timestamp?: string
        }
        Update: {
          avg_primary_latency?: number | null
          avg_replica_latency?: number | null
          connection_type?: string | null
          failover_count?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          primary_query_count?: number | null
          query_type?: string | null
          replica_healthy?: boolean | null
          replica_lag_ms?: number | null
          replica_query_count?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      retry_queue: {
        Row: {
          created_at: string | null
          id: string
          last_error: string | null
          max_retries: number | null
          payload: Json
          priority: number | null
          queue_type: string
          retry_count: number | null
          scheduled_for: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          payload: Json
          priority?: number | null
          queue_type: string
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          payload?: Json
          priority?: number | null
          queue_type?: string
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          ip_address_hash: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          ip_address_hash?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          ip_address_hash?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      semantic_search_history: {
        Row: {
          avg_similarity: number | null
          created_at: string | null
          id: string
          query_embedding: string
          query_text: string
          results_count: number | null
          user_id: string
        }
        Insert: {
          avg_similarity?: number | null
          created_at?: string | null
          id?: string
          query_embedding: string
          query_text: string
          results_count?: number | null
          user_id: string
        }
        Update: {
          avg_similarity?: number | null
          created_at?: string | null
          id?: string
          query_embedding?: string
          query_text?: string
          results_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      service_health_history: {
        Row: {
          checked_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          service_id: string | null
          status: string
        }
        Insert: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          service_id?: string | null
          status: string
        }
        Update: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_health_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      service_level_objectives: {
        Row: {
          active: boolean
          comparison_operator: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          priority: string
          slo_type: string
          target_value: number
          time_window: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          comparison_operator: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          priority?: string
          slo_type: string
          target_value: number
          time_window?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          comparison_operator?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          priority?: string
          slo_type?: string
          target_value?: number
          time_window?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_registry: {
        Row: {
          created_at: string | null
          dependencies: string[] | null
          endpoint: string | null
          health_check_interval_seconds: number | null
          id: string
          last_health_check: string | null
          metadata: Json | null
          service_name: string
          service_type: string
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          dependencies?: string[] | null
          endpoint?: string | null
          health_check_interval_seconds?: number | null
          id?: string
          last_health_check?: string | null
          metadata?: Json | null
          service_name: string
          service_type: string
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          dependencies?: string[] | null
          endpoint?: string | null
          health_check_interval_seconds?: number | null
          id?: string
          last_health_check?: string | null
          metadata?: Json | null
          service_name?: string
          service_type?: string
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      sli_metrics: {
        Row: {
          actual_percent: number
          id: string
          metadata: Json | null
          period: string
          sample_count: number | null
          sli_name: string
          target_percent: number
          timestamp: string
        }
        Insert: {
          actual_percent: number
          id?: string
          metadata?: Json | null
          period?: string
          sample_count?: number | null
          sli_name: string
          target_percent: number
          timestamp?: string
        }
        Update: {
          actual_percent?: number
          id?: string
          metadata?: Json | null
          period?: string
          sample_count?: number | null
          sli_name?: string
          target_percent?: number
          timestamp?: string
        }
        Relationships: []
      }
      slo_compliance_history: {
        Row: {
          breached: boolean
          compliance_percentage: number
          created_at: string
          current_value: number
          id: string
          metadata: Json | null
          slo_id: string
          target_value: number
          timestamp: string
        }
        Insert: {
          breached?: boolean
          compliance_percentage: number
          created_at?: string
          current_value: number
          id?: string
          metadata?: Json | null
          slo_id: string
          target_value: number
          timestamp?: string
        }
        Update: {
          breached?: boolean
          compliance_percentage?: number
          created_at?: string
          current_value?: number
          id?: string
          metadata?: Json | null
          slo_id?: string
          target_value?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "slo_compliance_history_slo_id_fkey"
            columns: ["slo_id"]
            isOneToOne: false
            referencedRelation: "service_level_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      spending_patterns: {
        Row: {
          cached_at: string
          data: Json
          expires_at: string
          id: string
          pattern_type: string
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          cached_at?: string
          data?: Json
          expires_at?: string
          id?: string
          pattern_type: string
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          cached_at?: string
          data?: Json
          expires_at?: string
          id?: string
          pattern_type?: string
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          component: string
          id: string
          ip_address_hash: string | null
          level: string
          message: string
          metadata: Json | null
          request_id: string | null
          stack_trace: string | null
          timestamp: string
          trace_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component: string
          id?: string
          ip_address_hash?: string | null
          level: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          stack_trace?: string | null
          timestamp?: string
          trace_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string
          id?: string
          ip_address_hash?: string | null
          level?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          stack_trace?: string | null
          timestamp?: string
          trace_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          tags: Json | null
          timestamp: string
          unit: string | null
          value: number
        }
        Insert: {
          id?: string
          metric_name: string
          tags?: Json | null
          timestamp?: string
          unit?: string | null
          value: number
        }
        Update: {
          id?: string
          metric_name?: string
          tags?: Json | null
          timestamp?: string
          unit?: string | null
          value?: number
        }
        Relationships: []
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
      trace_errors: {
        Row: {
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          span_id: string | null
          stack_trace: string | null
          timestamp: string | null
          trace_id: string
        }
        Insert: {
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          span_id?: string | null
          stack_trace?: string | null
          timestamp?: string | null
          trace_id: string
        }
        Update: {
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          span_id?: string | null
          stack_trace?: string | null
          timestamp?: string | null
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trace_errors_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["trace_id"]
          },
        ]
      }
      trace_spans: {
        Row: {
          attributes: Json | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          events: Json | null
          id: string
          operation_name: string
          parent_span_id: string | null
          service_name: string
          span_id: string
          span_type: string
          started_at: string
          status: string | null
          trace_id: string
        }
        Insert: {
          attributes?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          events?: Json | null
          id?: string
          operation_name: string
          parent_span_id?: string | null
          service_name: string
          span_id: string
          span_type: string
          started_at?: string
          status?: string | null
          trace_id: string
        }
        Update: {
          attributes?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          events?: Json | null
          id?: string
          operation_name?: string
          parent_span_id?: string | null
          service_name?: string
          span_id?: string
          span_type?: string
          started_at?: string
          status?: string | null
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trace_spans_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["trace_id"]
          },
        ]
      }
      traces: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          operation_name: string
          started_at: string
          status: string | null
          tags: Json | null
          trace_id: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_name: string
          started_at?: string
          status?: string | null
          tags?: Json | null
          trace_id: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_name?: string
          started_at?: string
          status?: string | null
          tags?: Json | null
          trace_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transaction_events_log: {
        Row: {
          completed_at: string | null
          correlation_id: string | null
          created_at: string | null
          event_type: string
          id: string
          idempotency_key: string
          request_payload: Json
          response_payload: Json | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          request_payload: Json
          response_payload?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          request_payload?: Json
          response_payload?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_rules: {
        Row: {
          actions: Json
          active: boolean | null
          conditions: Json
          created_at: string
          id: string
          priority: number | null
          rule_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          active?: boolean | null
          conditions?: Json
          created_at?: string
          id?: string
          priority?: number | null
          rule_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          active?: boolean | null
          conditions?: Json
          created_at?: string
          id?: string
          priority?: number | null
          rule_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          embedding: string | null
          geofence_id: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          merchant_id: string | null
          receipt_url: string | null
          synced: boolean | null
          timestamp: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          geofence_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          merchant_id?: string | null
          receipt_url?: string | null
          synced?: boolean | null
          timestamp?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          geofence_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          merchant_id?: string | null
          receipt_url?: string | null
          synced?: boolean | null
          timestamp?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          accepted_privacy: boolean
          accepted_terms: boolean
          affiliate_policy_version: string
          ai_policy_version: string
          consent_affiliate_transparency: boolean
          consent_ai: boolean
          consent_data_processing: boolean
          consent_emails: boolean
          consent_info_accuracy: boolean
          consent_policy_version: string
          consent_timestamp: string
          created_at: string
          data_processing_version: string
          id: string
          ip_address: string | null
          privacy_version: string
          terms_version: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_privacy?: boolean
          accepted_terms?: boolean
          affiliate_policy_version?: string
          ai_policy_version?: string
          consent_affiliate_transparency?: boolean
          consent_ai?: boolean
          consent_data_processing?: boolean
          consent_emails?: boolean
          consent_info_accuracy?: boolean
          consent_policy_version?: string
          consent_timestamp?: string
          created_at?: string
          data_processing_version?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_privacy?: boolean
          accepted_terms?: boolean
          affiliate_policy_version?: string
          ai_policy_version?: string
          consent_affiliate_transparency?: boolean
          consent_ai?: boolean
          consent_data_processing?: boolean
          consent_emails?: boolean
          consent_info_accuracy?: boolean
          consent_policy_version?: string
          consent_timestamp?: string
          created_at?: string
          data_processing_version?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          badge_count: number | null
          created_at: string | null
          device_name: string | null
          fcm_token: string
          id: string
          notification_preferences: Json | null
          platform: string
          push_enabled: boolean | null
          token_expired: boolean | null
          token_last_verified: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badge_count?: number | null
          created_at?: string | null
          device_name?: string | null
          fcm_token: string
          id?: string
          notification_preferences?: Json | null
          platform: string
          push_enabled?: boolean | null
          token_expired?: boolean | null
          token_last_verified?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badge_count?: number | null
          created_at?: string | null
          device_name?: string | null
          fcm_token?: string
          id?: string
          notification_preferences?: Json | null
          platform?: string
          push_enabled?: boolean | null
          token_expired?: boolean | null
          token_last_verified?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_experiment_assignments: {
        Row: {
          assigned_at: string
          experiment_id: string
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string
          experiment_id: string
          id?: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string
          experiment_id?: string
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_merchants: {
        Row: {
          created_at: string | null
          foursquare_id: string | null
          id: string
          lat: number | null
          lng: number | null
          merchant_address: string | null
          merchant_category: string | null
          merchant_id: string | null
          merchant_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          foursquare_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_address?: string | null
          merchant_category?: string | null
          merchant_id?: string | null
          merchant_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          foursquare_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_address?: string | null
          merchant_category?: string | null
          merchant_id?: string | null
          merchant_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_merchants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_merchants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tier_config: {
        Row: {
          created_at: string | null
          daily_cost_limit: number
          hourly_request_limit: number
          monthly_request_limit: number
          priority: number
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_cost_limit?: number
          hourly_request_limit?: number
          monthly_request_limit?: number
          priority?: number
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_cost_limit?: number
          hourly_request_limit?: number
          monthly_request_limit?: number
          priority?: number
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
          retry_count: number | null
          signature: string | null
          source: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          retry_count?: number | null
          signature?: string | null
          source: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          retry_count?: number | null
          signature?: string | null
          source?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          context: Json | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          trigger_data: Json | null
          trigger_type: string | null
          updated_at: string | null
          workflow_id: string | null
          workflow_name: string
          workflow_version: number
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          workflow_id?: string | null
          workflow_name: string
          workflow_version: number
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          workflow_id?: string | null
          workflow_name?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string
          enabled: boolean | null
          id: string
          last_run_at: string | null
          next_run_at: string | null
          run_count: number | null
          schedule_name: string
          timezone: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_name: string
          timezone?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_name?: string
          timezone?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string | null
          id: string
          input_data: Json | null
          max_retries: number | null
          output_data: Json | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          step_index: number
          step_name: string
          step_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string | null
          id?: string
          input_data?: Json | null
          max_retries?: number | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_index: number
          step_name: string
          step_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string | null
          id?: string
          input_data?: Json | null
          max_retries?: number | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_index?: number
          step_name?: string
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          definition: Json
          description: string | null
          enabled: boolean | null
          id: string
          metadata: Json | null
          updated_at: string | null
          version: number | null
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          definition: Json
          description?: string | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          version?: number | null
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          definition?: Json
          description?: string | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          version?: number | null
          workflow_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      extension_telemetry_stats: {
        Row: {
          active_records: number | null
          expired_records: number | null
          newest_record: string | null
          oldest_record: string | null
          total_records: number | null
        }
        Relationships: []
      }
      ocr_operational_metrics: {
        Row: {
          avg_cost_per_request: number | null
          failed_requests: number | null
          hour: string | null
          success_rate: number | null
          successful_requests: number | null
          total_cost: number | null
          total_requests: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      ocr_queue_status: {
        Row: {
          avg_retries: number | null
          count: number | null
          newest_item: string | null
          oldest_item: string | null
          status: string | null
        }
        Relationships: []
      }
      ocr_system_health: {
        Row: {
          active_anomalies: number | null
          active_users: number | null
          pending_queue: number | null
          success_rate: number | null
          timeframe: string | null
          total_cost: number | null
          total_requests: number | null
        }
        Relationships: []
      }
      ocr_user_tier_summary: {
        Row: {
          avg_daily_limit: number | null
          avg_hourly_limit: number | null
          tier: string | null
          total_monthly_capacity: number | null
          user_count: number | null
        }
        Relationships: []
      }
      profiles_masked: {
        Row: {
          created_at: string | null
          email_masked: string | null
          full_name: string | null
          id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_masked?: never
          full_name?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_masked?: never
          full_name?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_password_to_history: {
        Args: { p_password_hash: string; p_user_id: string }
        Returns: undefined
      }
      check_password_history: {
        Args: {
          p_history_limit?: number
          p_password_hash: string
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_expired_foursquare_cache: { Args: never; Returns: number }
      cleanup_expired_google_maps_cache: { Args: never; Returns: number }
      cleanup_expired_insights: { Args: never; Returns: number }
      cleanup_expired_mfa_codes: { Args: never; Returns: number }
      cleanup_expired_push_tokens: { Args: never; Returns: number }
      cleanup_expired_recommendations: { Args: never; Returns: number }
      cleanup_expired_request_signatures: { Args: never; Returns: number }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      cleanup_old_auth_attempts: { Args: never; Returns: number }
      cleanup_old_csp_violations: { Args: never; Returns: number }
      cleanup_old_extension_telemetry: { Args: never; Returns: number }
      cleanup_old_feature_flag_audit: { Args: never; Returns: number }
      cleanup_old_foursquare_logs: { Args: never; Returns: number }
      cleanup_old_google_maps_logs: { Args: never; Returns: number }
      cleanup_old_health_history: { Args: never; Returns: number }
      cleanup_old_incidents: { Args: never; Returns: number }
      cleanup_old_notification_logs: { Args: never; Returns: number }
      cleanup_old_ocr_data: { Args: never; Returns: Json }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      cleanup_old_replica_metrics: { Args: never; Returns: number }
      cleanup_old_retry_queue: { Args: never; Returns: number }
      cleanup_old_security_logs: { Args: never; Returns: number }
      cleanup_old_system_logs: { Args: never; Returns: number }
      cleanup_old_system_metrics: { Args: never; Returns: number }
      cleanup_old_traces: { Args: never; Returns: undefined }
      cleanup_old_workflow_executions: { Args: never; Returns: number }
      cleanup_unverified_accounts: { Args: never; Returns: number }
      clear_login_attempts:
        | { Args: { p_user_id: string }; Returns: undefined }
        | { Args: { p_identifier: string }; Returns: undefined }
      decrypt_pii: { Args: { secret_id: string }; Returns: string }
      decrypt_totp_secret: { Args: { secret_id: string }; Returns: string }
      delete_totp_vault_secret: {
        Args: { secret_id: string }
        Returns: undefined
      }
      detect_ocr_anomalies: { Args: { p_user_id: string }; Returns: Json }
      encrypt_pii: { Args: { data: string }; Returns: string }
      encrypt_totp_secret:
        | { Args: { secret: string; user_id: string }; Returns: string }
        | { Args: { secret: string }; Returns: string }
      evaluate_feature_flag: {
        Args: { p_environment?: string; p_flag_name: string; p_user_id: string }
        Returns: boolean
      }
      evaluate_transaction_rules: {
        Args: { p_transaction_data: Json; p_user_id: string }
        Returns: Json
      }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          providers: string[]
          status: string
          user_id: string
        }[]
      }
      get_decrypted_profile: {
        Args: { p_user_id: string }
        Returns: {
          auth_provider: string
          created_at: string
          email: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          pending_new_email: string
          phone: string
          status: string
          updated_at: string
        }[]
      }
      get_trace_statistics: {
        Args: { p_end_time?: string; p_start_time?: string }
        Returns: {
          avg_duration_ms: number
          completed_traces: number
          error_rate: number
          error_traces: number
          p50_duration_ms: number
          p95_duration_ms: number
          p99_duration_ms: number
          total_traces: number
        }[]
      }
      get_user_providers: { Args: { p_user_id: string }; Returns: string[] }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_ip: { Args: { ip: string }; Returns: string }
      hash_pii: { Args: { data: string }; Returns: string }
      increment_cache_hit: { Args: { cache_id: string }; Returns: undefined }
      invalidate_all_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_account_locked:
        | { Args: { p_user_id: string }; Returns: boolean }
        | { Args: { p_identifier: string }; Returns: Record<string, unknown> }
      mark_token_used:
        | { Args: { p_token: string }; Returns: undefined }
        | { Args: { p_token_id: string }; Returns: undefined }
      mask_email: { Args: { email: string }; Returns: string }
      mask_phone: { Args: { phone: string }; Returns: string }
      mask_ssn: { Args: { ssn: string }; Returns: string }
      migrate_existing_pii_to_encrypted: {
        Args: never
        Returns: {
          error_count: number
          errors: Json
          migrated_count: number
        }[]
      }
      record_login_attempt: {
        Args: {
          p_identifier: string
          p_ip_address: string
          p_metadata?: Json
          p_success: boolean
          p_user_id?: string
        }
        Returns: undefined
      }
      refresh_materialized_view: {
        Args: { view_name: string }
        Returns: undefined
      }
      validate_reset_token: {
        Args: { p_token: string }
        Returns: {
          is_valid: boolean
          token_id: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "developer" | "user"
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
      app_role: ["admin", "developer", "user"],
    },
  },
} as const
