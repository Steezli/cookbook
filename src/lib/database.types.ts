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
      admin_error_investigation: {
        Row: {
          affected_users: number | null
          corrective_action: string | null
          created_at: string
          error_id: string | null
          estimated_impact: string | null
          findings: string | null
          id: string
          investigation_notes: Json | null
          investigator_id: string | null
          prevention_action: string | null
          priority: string
          resolved_at: string | null
          root_cause: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_users?: number | null
          corrective_action?: string | null
          created_at?: string
          error_id?: string | null
          estimated_impact?: string | null
          findings?: string | null
          id?: string
          investigation_notes?: Json | null
          investigator_id?: string | null
          prevention_action?: string | null
          priority: string
          resolved_at?: string | null
          root_cause?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          affected_users?: number | null
          corrective_action?: string | null
          created_at?: string
          error_id?: string | null
          estimated_impact?: string | null
          findings?: string | null
          id?: string
          investigation_notes?: Json | null
          investigator_id?: string | null
          prevention_action?: string | null
          priority?: string
          resolved_at?: string | null
          root_cause?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_error_investigation_error_id_fkey"
            columns: ["error_id"]
            isOneToOne: false
            referencedRelation: "job_errors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_error_investigation_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      collection_recipes: {
        Row: {
          added_at: string
          collection_id: string
          recipe_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          recipe_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_recipes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      error_alerts: {
        Row: {
          affected_jobs: string[] | null
          alert_type: string
          auto_resolve: boolean | null
          created_at: string
          description: string | null
          error_pattern: string | null
          id: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          threshold_exceeded: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_jobs?: string[] | null
          alert_type: string
          auto_resolve?: boolean | null
          created_at?: string
          description?: string | null
          error_pattern?: string | null
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          threshold_exceeded?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_jobs?: string[] | null
          alert_type?: string
          auto_resolve?: boolean | null
          created_at?: string
          description?: string | null
          error_pattern?: string | null
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          threshold_exceeded?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      error_feedback: {
        Row: {
          created_at: string
          error_id: string | null
          feedback_text: string | null
          feedback_type: string
          id: string
          job_id: string | null
          rating: number | null
          resolution_method: string | null
          user_id: string
          was_resolved: boolean | null
        }
        Insert: {
          created_at?: string
          error_id?: string | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          job_id?: string | null
          rating?: number | null
          resolution_method?: string | null
          user_id: string
          was_resolved?: boolean | null
        }
        Update: {
          created_at?: string
          error_id?: string | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          job_id?: string | null
          rating?: number | null
          resolution_method?: string | null
          user_id?: string
          was_resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "error_feedback_error_id_fkey"
            columns: ["error_id"]
            isOneToOne: false
            referencedRelation: "job_errors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      error_trends: {
        Row: {
          avg_retry_attempts: number | null
          created_at: string
          error_category: string
          error_pattern: string
          error_severity: string
          id: string
          last_occurrence: string
          occurrence_count: number
          resolution_rate: number | null
          updated_at: string
          user_impact_score: number | null
        }
        Insert: {
          avg_retry_attempts?: number | null
          created_at?: string
          error_category: string
          error_pattern: string
          error_severity: string
          id?: string
          last_occurrence?: string
          occurrence_count?: number
          resolution_rate?: number | null
          updated_at?: string
          user_impact_score?: number | null
        }
        Update: {
          avg_retry_attempts?: number | null
          created_at?: string
          error_category?: string
          error_pattern?: string
          error_severity?: string
          id?: string
          last_occurrence?: string
          occurrence_count?: number
          resolution_rate?: number | null
          updated_at?: string
          user_impact_score?: number | null
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          created_by_user_id: string
          email: string
          expires_at: string
          family_id: string
          id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          email: string
          expires_at: string
          family_id: string
          id?: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_memberships: {
        Row: {
          created_at: string
          family_id: string
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_memberships_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      job_errors: {
        Row: {
          can_retry: boolean
          category: string
          context: Json | null
          created_at: string
          id: string
          job_id: string
          message: string
          retry_delay: number | null
          severity: string
          technical_details: string | null
          user_guidance: string
        }
        Insert: {
          can_retry?: boolean
          category: string
          context?: Json | null
          created_at?: string
          id?: string
          job_id: string
          message: string
          retry_delay?: number | null
          severity: string
          technical_details?: string | null
          user_guidance: string
        }
        Update: {
          can_retry?: boolean
          category?: string
          context?: Json | null
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          retry_delay?: number | null
          severity?: string
          technical_details?: string | null
          user_guidance?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_retry_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          delay_minutes: number
          error_category: string
          error_message: string
          error_severity: string
          id: string
          job_id: string
          retry_strategy: Json | null
          success: boolean
        }
        Insert: {
          attempt_number: number
          created_at?: string
          delay_minutes: number
          error_category: string
          error_message: string
          error_severity: string
          id?: string
          job_id: string
          retry_strategy?: Json | null
          success?: boolean
        }
        Update: {
          attempt_number?: number
          created_at?: string
          delay_minutes?: number
          error_category?: string
          error_message?: string
          error_severity?: string
          id?: string
          job_id?: string
          retry_strategy?: Json | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_retry_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          created_at: string
          current_step: string | null
          estimated_minutes: number | null
          id: string
          job_id: string
          message: string | null
          metadata: Json | null
          progress_percentage: number | null
          status: string
          total_steps: number | null
        }
        Insert: {
          created_at?: string
          current_step?: string | null
          estimated_minutes?: number | null
          id?: string
          job_id: string
          message?: string | null
          metadata?: Json | null
          progress_percentage?: number | null
          status: string
          total_steps?: number | null
        }
        Update: {
          created_at?: string
          current_step?: string | null
          estimated_minutes?: number | null
          id?: string
          job_id?: string
          message?: string | null
          metadata?: Json | null
          progress_percentage?: number | null
          status?: string
          total_steps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          unit_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          unit_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          unit_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean
          parent_comment_id: string | null
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_comment_id?: string | null
          recipe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_comment_id?: string | null
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "recipe_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_comments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_photos: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_photos_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ratings: {
        Row: {
          created_at: string
          rating: number
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          rating: number
          recipe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          rating?: number
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          ingredients: Json
          owner_user_id: string
          prep_time_minutes: number | null
          rating_average: number | null
          rating_count: number
          servings: number | null
          source_story: string | null
          steps: Json
          tags: string[] | null
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["recipe_visibility"]
        }
        Insert: {
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          ingredients?: Json
          owner_user_id: string
          prep_time_minutes?: number | null
          rating_average?: number | null
          rating_count?: number
          servings?: number | null
          source_story?: string | null
          steps?: Json
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Update: {
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          ingredients?: Json
          owner_user_id?: string
          prep_time_minutes?: number | null
          rating_average?: number | null
          rating_count?: number
          servings?: number | null
          source_story?: string | null
          steps?: Json
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_drafts: {
        Row: {
          ai_model_version: string | null
          confidence_level: string
          cook_time_minutes: number | null
          created_at: string
          draft_index: number
          field_confidence: Json | null
          id: string
          ingredients: Json | null
          instructions: Json | null
          job_id: string
          ocr_confidence: number | null
          ocr_confidence_score: number | null
          prep_time_minutes: number | null
          processing_time_ms: number | null
          raw_text: string | null
          scan_job_id: string | null
          servings: number | null
          status: string
          structured_data: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model_version?: string | null
          confidence_level?: string
          cook_time_minutes?: number | null
          created_at?: string
          draft_index?: number
          field_confidence?: Json | null
          id?: string
          ingredients?: Json | null
          instructions?: Json | null
          job_id: string
          ocr_confidence?: number | null
          ocr_confidence_score?: number | null
          prep_time_minutes?: number | null
          processing_time_ms?: number | null
          raw_text?: string | null
          scan_job_id?: string | null
          servings?: number | null
          status?: string
          structured_data?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model_version?: string | null
          confidence_level?: string
          cook_time_minutes?: number | null
          created_at?: string
          draft_index?: number
          field_confidence?: Json | null
          id?: string
          ingredients?: Json | null
          instructions?: Json | null
          job_id?: string
          ocr_confidence?: number | null
          ocr_confidence_score?: number | null
          prep_time_minutes?: number | null
          processing_time_ms?: number | null
          raw_text?: string | null
          scan_job_id?: string | null
          servings?: number | null
          status?: string
          structured_data?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_drafts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_drafts_scan_job_id_fkey"
            columns: ["scan_job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          created_at: string
          current_step: string | null
          error_message: string | null
          estimated_minutes_remaining: number | null
          id: string
          max_retries: number
          photo_count: number
          photo_url: string
          photo_urls: string[] | null
          priority: number
          progress_percentage: number | null
          retry_count: number
          status: string
          subscription_tier: string
          total_steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          estimated_minutes_remaining?: number | null
          id?: string
          max_retries?: number
          photo_count?: number
          photo_url: string
          photo_urls?: string[] | null
          priority?: number
          progress_percentage?: number | null
          retry_count?: number
          status: string
          subscription_tier?: string
          total_steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          estimated_minutes_remaining?: number | null
          id?: string
          max_retries?: number
          photo_count?: number
          photo_url?: string
          photo_urls?: string[] | null
          priority?: number
          progress_percentage?: number | null
          retry_count?: number
          status?: string
          subscription_tier?: string
          total_steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_family_invite: { Args: { p_token: string }; Returns: string }
      calculate_draft_confidence: {
        Args: { draft_id: string }
        Returns: {
          field_confidence: Json
          needs_review: boolean
          overall_confidence: number
          status: string
        }[]
      }
      create_family: { Args: { p_name: string }; Returns: string }
      create_family_invite: {
        Args: { p_email: string; p_family_id: string }
        Returns: {
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      delete_recipe_comment: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      enhance_draft_field: {
        Args: { draft_id: string; field_name: string; original_text: string }
        Returns: {
          ai_suggestions: Json
          confidence: number
          enhanced_text: string
        }[]
      }
      get_enhanced_job_status: {
        Args: { job_id: string }
        Returns: {
          can_cancel: boolean
          can_retry: boolean
          created_at: string
          current_step: string
          error_count: number
          error_guidance: string
          error_severity: string
          estimated_minutes_remaining: number
          id: string
          latest_error: string
          max_retries: number
          photo_url: string
          priority: number
          progress_percentage: number
          retry_count: number
          status: string
          status_history: Json
          subscription_tier: string
          total_steps: number
          updated_at: string
          user_id: string
        }[]
      }
      get_error_analytics_dashboard: {
        Args: {
          end_date?: string
          start_date?: string
          user_id_filter?: string
        }
        Returns: {
          critical_alerts_count: number
          error_rate: number
          open_investigations_count: number
          period_end: string
          period_start: string
          recovery_rate: number
          retry_rate: number
          top_error_categories: Json
          top_error_messages: Json
          total_errors: number
          total_jobs: number
          user_satisfaction_score: number
        }[]
      }
      get_job_statistics: {
        Args: { end_date?: string; start_date?: string; user_id_param?: string }
        Returns: {
          avg_processing_minutes: number
          completed_jobs: number
          errors_by_category: Json
          errors_by_severity: Json
          failed_jobs: number
          jobs_by_status: Json
          success_rate: number
          total_jobs: number
        }[]
      }
      get_job_status: {
        Args: { job_id: string }
        Returns: {
          can_cancel: boolean
          can_retry: boolean
          created_at: string
          error_message: string
          id: string
          max_retries: number
          retry_count: number
          status: string
          updated_at: string
        }[]
      }
      get_public_recipe_author: {
        Args: { p_recipe_id: string }
        Returns: {
          display_name: string
          initials: string
        }[]
      }
      get_public_recipe_authors: {
        Args: { p_recipe_ids: string[] }
        Returns: {
          display_name: string
          initials: string
          recipe_id: string
        }[]
      }
      get_recipe_comments: {
        Args: { p_recipe_id: string }
        Returns: {
          content: string
          created_at: string
          depth: number
          id: string
          is_edited: boolean
          parent_comment_id: string
          path: string
          recipe_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_error_history: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          can_retry: boolean
          error_category: string
          error_id: string
          error_message: string
          error_severity: string
          feedback_given: boolean
          feedback_rating: number
          feedback_type: string
          job_id: string
          occurred_at: string
          user_guidance: string
        }[]
      }
      increment_retry_count: { Args: { job_id: string }; Returns: number }
      is_family_admin: {
        Args: { p_family_id: string; p_user_id: string }
        Returns: boolean
      }
      is_family_admin_secure: {
        Args: { p_family_id: string; p_user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { p_family_id: string; p_user_id: string }
        Returns: boolean
      }
      is_family_member_secure: {
        Args: { p_family_id: string; p_user_id: string }
        Returns: boolean
      }
      log_job_error: {
        Args: {
          can_retry?: boolean
          error_category: string
          error_context?: Json
          error_message: string
          error_severity: string
          job_id: string
          retry_delay?: number
          technical_details?: string
          user_guidance?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      revoke_family_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      shares_family_with: {
        Args: { p_current_user_id: string; p_target_user_id: string }
        Returns: boolean
      }
      submit_error_feedback: {
        Args: {
          error_id: string
          feedback_text?: string
          feedback_type: string
          job_id: string
          rating?: number
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      update_job_status_enhanced: {
        Args: {
          current_step?: string
          estimated_minutes?: number
          job_id: string
          message?: string
          metadata?: Json
          new_status: string
          progress_percentage?: number
          total_steps?: number
        }
        Returns: {
          result_message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      family_role: "admin" | "member"
      recipe_visibility: "private" | "family" | "public"
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
      family_role: ["admin", "member"],
      recipe_visibility: ["private", "family", "public"],
    },
  },
} as const
