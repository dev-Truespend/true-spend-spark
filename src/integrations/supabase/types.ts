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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_password_to_history: {
        Args: { p_password_hash: string; p_user_id: string }
        Returns: undefined
      }
      check_password_history: {
        Args: {
          p_history_count?: number
          p_password_hash: string
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_expired_foursquare_cache: { Args: never; Returns: number }
      cleanup_expired_google_maps_cache: { Args: never; Returns: number }
      cleanup_expired_mfa_codes: { Args: never; Returns: number }
      cleanup_expired_push_tokens: { Args: never; Returns: number }
      cleanup_old_auth_attempts: { Args: never; Returns: number }
      cleanup_old_csp_violations: { Args: never; Returns: number }
      cleanup_old_foursquare_logs: { Args: never; Returns: number }
      cleanup_old_google_maps_logs: { Args: never; Returns: number }
      cleanup_old_notification_logs: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      cleanup_old_security_logs: { Args: never; Returns: number }
      cleanup_unverified_accounts: { Args: never; Returns: number }
      clear_login_attempts: {
        Args: { p_identifier: string }
        Returns: undefined
      }
      decrypt_pii: { Args: { secret_id: string }; Returns: string }
      decrypt_totp_secret: { Args: { secret_id: string }; Returns: string }
      delete_totp_vault_secret: {
        Args: { secret_id: string }
        Returns: undefined
      }
      encrypt_pii: { Args: { data: string }; Returns: string }
      encrypt_totp_secret: { Args: { secret: string }; Returns: string }
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
      invalidate_all_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_account_locked: {
        Args: { p_identifier: string }
        Returns: Record<string, unknown>
      }
      mark_token_used: { Args: { p_token: string }; Returns: undefined }
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
      validate_reset_token: {
        Args: { p_token: string }
        Returns: {
          error_message: string
          expires_at: string
          is_valid: boolean
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
