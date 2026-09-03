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
      ai_actions: {
        Row: {
          action_type: string
          company_id: string
          conversation_id: string | null
          description: string
          error_message: string | null
          id: string
          message_id: string | null
          proposed_at: string
          resolved_at: string | null
          status: string
          target_id: string
          target_table: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          company_id: string
          conversation_id?: string | null
          description: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          proposed_at?: string
          resolved_at?: string | null
          status?: string
          target_id: string
          target_table: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string
          conversation_id?: string | null
          description?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          proposed_at?: string
          resolved_at?: string | null
          status?: string
          target_id?: string
          target_table?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_log: {
        Row: {
          company_id: string
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          message_id: string | null
          model: string | null
          provider: string | null
          success: boolean
          tools_executed: Json | null
          tools_requested: Json | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          model?: string | null
          provider?: string | null
          success?: boolean
          tools_executed?: Json | null
          tools_requested?: Json | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          model?: string | null
          provider?: string | null
          success?: boolean
          tools_executed?: Json | null
          tools_requested?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_audit_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sources: Json | null
          tool_calls: Json | null
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sources?: Json | null
          tool_calls?: Json | null
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sources?: Json | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          company_id: string
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          announcement_id: string
          company_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          announcement_id?: string
          company_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "announcement_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_profile_id: string | null
          body: string
          company_id: string
          created_at: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_profile_id?: string | null
          body: string
          company_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_profile_id?: string | null
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          job_opening_id: string
          rejected_reason: string | null
          stage: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          job_opening_id: string
          rejected_reason?: string | null
          stage?: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          job_opening_id?: string
          rejected_reason?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_type: string
          assigned_date: string
          company_id: string
          created_at: string
          description: string | null
          employee_id: string
          id: string
          returned_date: string | null
          status: string
        }
        Insert: {
          asset_type: string
          assigned_date?: string
          company_id: string
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          returned_date?: string | null
          status?: string
        }
        Update: {
          asset_type?: string
          assigned_date?: string
          company_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          returned_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_in_accuracy_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out: string | null
          check_out_accuracy_m: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          company_id: string
          created_at: string
          created_by: string | null
          early_departure_minutes: number
          employee_id: string
          id: string
          late_minutes: number
          leave_request_id: string | null
          notes: string | null
          overtime_minutes: number
          shift_id: string | null
          source: string
          status: string | null
          updated_at: string
          worked_minutes: number
        }
        Insert: {
          attendance_date: string
          check_in?: string | null
          check_in_accuracy_m?: number | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_path?: string | null
          check_out?: string | null
          check_out_accuracy_m?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_path?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          early_departure_minutes?: number
          employee_id: string
          id?: string
          late_minutes?: number
          leave_request_id?: string | null
          notes?: string | null
          overtime_minutes?: number
          shift_id?: string | null
          source?: string
          status?: string | null
          updated_at?: string
          worked_minutes?: number
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_in_accuracy_m?: number | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_path?: string | null
          check_out?: string | null
          check_out_accuracy_m?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_path?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          early_departure_minutes?: number
          employee_id?: string
          id?: string
          late_minutes?: number
          leave_request_id?: string | null
          notes?: string | null
          overtime_minutes?: number
          shift_id?: string | null
          source?: string
          status?: string | null
          updated_at?: string
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          attendance_date: string
          company_id: string
          created_at: string
          employee_id: string
          id: string
          reason: string
          requested_by: string | null
          requested_check_in: string | null
          requested_check_out: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          attendance_date: string
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          reason: string
          requested_by?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          attendance_date?: string
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string
          requested_by?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attendance_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_types: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          is_head_office: boolean
          name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_head_office?: boolean
          name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_head_office?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      candidates: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          resume_url: string | null
          source: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          source?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      clickup_connections: {
        Row: {
          clickup_team_id: string
          clickup_team_name: string | null
          company_id: string
          connected_at: string
          connected_by: string | null
          id: string
          last_error: string | null
          last_sync_summary: Json | null
          last_synced_at: string | null
          status: string
          token_vault_secret_name: string
          updated_at: string
        }
        Insert: {
          clickup_team_id: string
          clickup_team_name?: string | null
          company_id: string
          connected_at?: string
          connected_by?: string | null
          id?: string
          last_error?: string | null
          last_sync_summary?: Json | null
          last_synced_at?: string | null
          status?: string
          token_vault_secret_name: string
          updated_at?: string
        }
        Update: {
          clickup_team_id?: string
          clickup_team_name?: string | null
          company_id?: string
          connected_at?: string
          connected_by?: string | null
          id?: string
          last_error?: string | null
          last_sync_summary?: Json | null
          last_synced_at?: string | null
          status?: string
          token_vault_secret_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "clickup_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_project_links: {
        Row: {
          clickup_folder_name: string | null
          clickup_list_id: string
          clickup_list_name: string | null
          clickup_space_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
        }
        Insert: {
          clickup_folder_name?: string | null
          clickup_list_id: string
          clickup_list_name?: string | null
          clickup_space_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
        }
        Update: {
          clickup_folder_name?: string | null
          clickup_list_id?: string
          clickup_list_name?: string | null
          clickup_space_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_project_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_project_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "clickup_project_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_user_links: {
        Row: {
          clickup_email: string | null
          clickup_user_id: string
          clickup_username: string | null
          company_id: string
          created_at: string
          employee_id: string | null
          id: string
          matched_by: string
          updated_at: string
        }
        Insert: {
          clickup_email?: string | null
          clickup_user_id: string
          clickup_username?: string | null
          company_id: string
          created_at?: string
          employee_id?: string | null
          id?: string
          matched_by?: string
          updated_at?: string
        }
        Update: {
          clickup_email?: string | null
          clickup_user_id?: string
          clickup_username?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          matched_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clickup_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "clickup_user_links_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          eobi_minimum_wage_base: number
          fiscal_year_start: string | null
          gratuity_days_per_year: number
          gratuity_min_years: number
          id: string
          is_demo: boolean
          name: string
          next_employee_seq: number
          payroll_run_day_of_month: number | null
          plan: string
          require_clockin_photo: boolean
          slug: string
          standard_monthly_days: number
          standard_monthly_hours: number
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          eobi_minimum_wage_base?: number
          fiscal_year_start?: string | null
          gratuity_days_per_year?: number
          gratuity_min_years?: number
          id?: string
          is_demo?: boolean
          name: string
          next_employee_seq?: number
          payroll_run_day_of_month?: number | null
          plan?: string
          require_clockin_photo?: boolean
          slug: string
          standard_monthly_days?: number
          standard_monthly_hours?: number
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          eobi_minimum_wage_base?: number
          fiscal_year_start?: string | null
          gratuity_days_per_year?: number
          gratuity_min_years?: number
          id?: string
          is_demo?: boolean
          name?: string
          next_employee_seq?: number
          payroll_run_day_of_month?: number | null
          plan?: string
          require_clockin_photo?: boolean
          slug?: string
          standard_monthly_days?: number
          standard_monthly_hours?: number
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_events: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          id: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_metric_snapshots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metric_key: string
          snapshot_date: string
          value: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metric_key: string
          snapshot_date: string
          value?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metric_key?: string
          snapshot_date?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_metric_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_metric_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      custom_dashboard_widgets: {
        Row: {
          chart_type: string
          combo_metric_key: string | null
          company_id: string
          comparison_from: string | null
          comparison_mode: string
          comparison_to: string | null
          created_at: string
          dashboard_id: string
          date_from: string | null
          date_mode: string
          date_preset: string | null
          date_to: string | null
          filters: Json
          height_px: number
          id: string
          metric_key: string
          size: string
          sort_order: number
          target_value: number | null
          title: string | null
          width_pct: number
        }
        Insert: {
          chart_type?: string
          combo_metric_key?: string | null
          company_id: string
          comparison_from?: string | null
          comparison_mode?: string
          comparison_to?: string | null
          created_at?: string
          dashboard_id: string
          date_from?: string | null
          date_mode?: string
          date_preset?: string | null
          date_to?: string | null
          filters?: Json
          height_px?: number
          id?: string
          metric_key: string
          size?: string
          sort_order?: number
          target_value?: number | null
          title?: string | null
          width_pct?: number
        }
        Update: {
          chart_type?: string
          combo_metric_key?: string | null
          company_id?: string
          comparison_from?: string | null
          comparison_mode?: string
          comparison_to?: string | null
          created_at?: string
          dashboard_id?: string
          date_from?: string | null
          date_mode?: string
          date_preset?: string | null
          date_to?: string | null
          filters?: Json
          height_px?: number
          id?: string
          metric_key?: string
          size?: string
          sort_order?: number
          target_value?: number | null
          title?: string | null
          width_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_dashboard_widgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_dashboard_widgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "custom_dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "custom_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_dashboards: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          date_from: string | null
          date_to: string | null
          filter_branch_id: string | null
          filter_department_id: string | null
          filter_employee_id: string | null
          filter_team_id: string | null
          folder: string | null
          id: string
          is_default: boolean
          is_favorite: boolean
          name: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          filter_branch_id?: string | null
          filter_department_id?: string | null
          filter_employee_id?: string | null
          filter_team_id?: string | null
          folder?: string | null
          id?: string
          is_default?: boolean
          is_favorite?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          filter_branch_id?: string | null
          filter_department_id?: string | null
          filter_employee_id?: string | null
          filter_team_id?: string | null
          folder?: string | null
          id?: string
          is_default?: boolean
          is_favorite?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_dashboards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_dashboards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "custom_dashboards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_dashboards_filter_branch_id_fkey"
            columns: ["filter_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_dashboards_filter_department_id_fkey"
            columns: ["filter_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_dashboards_filter_employee_id_fkey"
            columns: ["filter_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_dashboards_filter_team_id_fkey"
            columns: ["filter_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_metrics: {
        Row: {
          company_id: string
          created_at: string
          formula: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          formula: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          formula?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          department_head_employee_id: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department_head_employee_id?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department_head_employee_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "departments_head_fkey"
            columns: ["department_head_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          doc_type: string
          employee_id: string
          expiry_date: string | null
          file_path: string
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          doc_type: string
          employee_id: string
          expiry_date?: string | null
          file_path: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          doc_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_path?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_benefits: {
        Row: {
          benefit_type_id: string
          company_id: string
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          notes: string | null
          start_date: string
        }
        Insert: {
          benefit_type_id: string
          company_id: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
        }
        Update: {
          benefit_type_id?: string
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_benefit_type_id_fkey"
            columns: ["benefit_type_id"]
            isOneToOne: false
            referencedRelation: "benefit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_components: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          payroll_component_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          payroll_component_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          payroll_component_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "employee_salary_components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_payroll_component_id_fkey"
            columns: ["payroll_component_id"]
            isOneToOne: false
            referencedRelation: "payroll_components"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_settlements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          exit_date: string
          finalized_at: string | null
          finalized_by: string | null
          gratuity_amount: number
          id: string
          last_working_day: string | null
          leave_encashment_amount: number
          loan_recovery_amount: number
          net_settlement_amount: number
          notes: string | null
          notice_pay_adjustment: number
          other_adjustments: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          exit_date: string
          finalized_at?: string | null
          finalized_by?: string | null
          gratuity_amount?: number
          id?: string
          last_working_day?: string | null
          leave_encashment_amount?: number
          loan_recovery_amount?: number
          net_settlement_amount?: number
          notes?: string | null
          notice_pay_adjustment?: number
          other_adjustments?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          exit_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          gratuity_amount?: number
          id?: string
          last_working_day?: string | null
          leave_encashment_amount?: number
          loan_recovery_amount?: number
          net_settlement_amount?: number
          notes?: string | null
          notice_pay_adjustment?: number
          other_adjustments?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_settlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_settlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "employee_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_settlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_settlements_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_name: string | null
          basic_salary: number | null
          branch_id: string | null
          cnic: string | null
          company_id: string
          confirmation_date: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          designation_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string
          employment_status: string
          employment_type_id: string | null
          exit_date: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          hire_date: string | null
          id: string
          joining_date: string
          manager_id: string | null
          marital_status: string | null
          personal_email: string | null
          phone: string | null
          photo_url: string | null
          probation_period_months: number | null
          salary_level: string | null
          shift_id: string | null
          source_application_id: string | null
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          cnic?: string | null
          company_id: string
          confirmation_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          designation_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code: string
          employment_status?: string
          employment_type_id?: string | null
          exit_date?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          joining_date: string
          manager_id?: string | null
          marital_status?: string | null
          personal_email?: string | null
          phone?: string | null
          photo_url?: string | null
          probation_period_months?: number | null
          salary_level?: string | null
          shift_id?: string | null
          source_application_id?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          cnic?: string | null
          company_id?: string
          confirmation_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          designation_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string
          employment_status?: string
          employment_type_id?: string | null
          exit_date?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          joining_date?: string
          manager_id?: string | null
          marital_status?: string | null
          personal_email?: string | null
          phone?: string | null
          photo_url?: string | null
          probation_period_months?: number | null
          salary_level?: string | null
          shift_id?: string | null
          source_application_id?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_history: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          designation_id: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          employment_type_id: string | null
          id: string
          manager_id: string | null
          reason: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation_id?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          employment_type_id?: string | null
          id?: string
          manager_id?: string | null
          reason?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation_id?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          employment_type_id?: string | null
          id?: string
          manager_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "employment_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_history_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_types: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          max_amount: number | null
          name: string
          requires_receipt: boolean
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          max_amount?: number | null
          name: string
          requires_receipt?: boolean
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          max_amount?: number | null
          name?: string
          requires_receipt?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          amount: number
          category_id: string
          company_id: string
          created_at: string
          description: string | null
          employee_id: string
          expense_date: string
          id: string
          payroll_item_id: string | null
          receipt_url: string | null
          reimbursed_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          company_id: string
          created_at?: string
          description?: string | null
          employee_id: string
          expense_date: string
          id?: string
          payroll_item_id?: string | null
          receipt_url?: string | null
          reimbursed_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          expense_date?: string
          id?: string
          payroll_item_id?: string | null
          receipt_url?: string | null
          reimbursed_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "expense_claims_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_notes: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          given_by: string | null
          id: string
          note: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          given_by?: string | null
          id?: string
          note: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          given_by?: string | null
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "feedback_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_notes_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          id?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          body: string
          category_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "help_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "help_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          holiday_date: string
          id: string
          name: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          holiday_date: string
          id?: string
          name: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          company_id: string
          created_at: string
          feedback: string | null
          id: string
          interviewer_id: string | null
          rating: number | null
          round: string | null
          scheduled_at: string | null
          status: string
        }
        Insert: {
          application_id: string
          company_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          interviewer_id?: string | null
          rating?: number | null
          round?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          application_id?: string
          company_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          interviewer_id?: string | null
          rating?: number | null
          round?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          designation_id: string | null
          employment_type_id: string | null
          id: string
          opened_at: string
          status: string
          title: string
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          designation_id?: string | null
          employment_type_id?: string | null
          id?: string
          opened_at?: string
          status?: string
          title: string
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          designation_id?: string | null
          employment_type_id?: string | null
          id?: string
          opened_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "job_openings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          company_id: string | null
          content: string
          created_at: string
          document_id: string
          embedding: string
          id: string
          title: string
        }
        Insert: {
          chunk_index?: number
          company_id?: string | null
          content: string
          created_at?: string
          document_id: string
          embedding: string
          id?: string
          title: string
        }
        Update: {
          chunk_index?: number
          company_id?: string | null
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kpi_type: string
          metric_key: string | null
          name: string
          scoring_type: string
          status: string
          updated_at: string
          weight: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kpi_type: string
          metric_key?: string | null
          name: string
          scoring_type: string
          status?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kpi_type?: string
          metric_key?: string | null
          name?: string
          scoring_type?: string
          status?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "kpi_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          from_employee_id: string
          id: string
          message: string
          to_employee_id: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          from_employee_id: string
          id?: string
          message: string
          to_employee_id?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          from_employee_id?: string
          id?: string
          message?: string
          to_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kudos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "kudos_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_forward_days: number
          company_id: string
          created_at: string
          employee_id: string
          entitled_days: number
          id: string
          leave_type_id: string
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_forward_days?: number
          company_id: string
          created_at?: string
          employee_id: string
          entitled_days?: number
          id?: string
          leave_type_id: string
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          carried_forward_days?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          annual_entitlement_days: number
          carry_forward_enabled: boolean
          carry_forward_max_days: number
          company_id: string
          created_at: string
          employment_type_id: string | null
          id: string
          leave_type_id: string
          min_notice_days: number
          name: string
          requires_approval: boolean
        }
        Insert: {
          annual_entitlement_days?: number
          carry_forward_enabled?: boolean
          carry_forward_max_days?: number
          company_id: string
          created_at?: string
          employment_type_id?: string | null
          id?: string
          leave_type_id: string
          min_notice_days?: number
          name: string
          requires_approval?: boolean
        }
        Update: {
          annual_entitlement_days?: number
          carry_forward_enabled?: boolean
          carry_forward_max_days?: number
          company_id?: string
          created_at?: string
          employment_type_id?: string | null
          id?: string
          leave_type_id?: string
          min_notice_days?: number
          name?: string
          requires_approval?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leave_policies_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string
          created_at: string
          days_requested: number | null
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_requested?: number | null
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_requested?: number | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          applicable_gender: string | null
          company_id: string
          created_at: string
          id: string
          is_encashable: boolean
          is_paid: boolean
          name: string
        }
        Insert: {
          applicable_gender?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_encashable?: boolean
          is_paid?: boolean
          name: string
        }
        Update: {
          applicable_gender?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_encashable?: boolean
          is_paid?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          company_id: string
          created_at: string
          due_amount: number
          id: string
          installment_number: number
          loan_id: string
          payroll_item_id: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_amount: number
          id?: string
          installment_number: number
          loan_id: string
          payroll_item_id?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_amount?: number
          id?: string
          installment_number?: number
          loan_id?: string
          payroll_item_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          installment_amount: number
          loan_type: string
          principal_amount: number
          start_date: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          installment_amount: number
          loan_type?: string
          principal_amount: number
          start_date?: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          installment_amount?: number
          loan_type?: string
          principal_amount?: number
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "loans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          application_id: string
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          designation_id: string | null
          employment_type_id: string | null
          id: string
          joining_date: string | null
          offered_salary: number | null
          responded_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          application_id: string
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation_id?: string | null
          employment_type_id?: string | null
          id?: string
          joining_date?: string | null
          offered_salary?: number | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          application_id?: string
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation_id?: string | null
          employment_type_id?: string | null
          id?: string
          joining_date?: string | null
          offered_salary?: number | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "onboarding_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_tasks: {
        Row: {
          category: string
          days_from_joining: number
          description: string | null
          id: string
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          category?: string
          days_from_joining?: number
          description?: string | null
          id?: string
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          category?: string
          days_from_joining?: number
          description?: string | null
          id?: string
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "onboarding_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_records: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          minutes: number
          payroll_status: string
          rate_multiplier: number
          work_date: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          minutes: number
          payroll_status?: string
          rate_multiplier?: number
          work_date: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          minutes?: number
          payroll_status?: string
          rate_multiplier?: number
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_components: {
        Row: {
          calculation_method: string
          company_id: string
          component_type: string
          created_at: string
          id: string
          is_basic: boolean
          is_statutory: boolean
          name: string
          percentage: number | null
          status: string
          taxable: boolean
        }
        Insert: {
          calculation_method?: string
          company_id: string
          component_type: string
          created_at?: string
          id?: string
          is_basic?: boolean
          is_statutory?: boolean
          name: string
          percentage?: number | null
          status?: string
          taxable?: boolean
        }
        Update: {
          calculation_method?: string
          company_id?: string
          component_type?: string
          created_at?: string
          id?: string
          is_basic?: boolean
          is_statutory?: boolean
          name?: string
          percentage?: number | null
          status?: string
          taxable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payroll_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_components_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      payroll_employer_contributions: {
        Row: {
          amount: number
          company_id: string
          contribution_type: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          payroll_run_id: string
        }
        Insert: {
          amount: number
          company_id: string
          contribution_type: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          payroll_run_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          contribution_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payroll_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employer_contributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employer_contributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payroll_employer_contributions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employer_contributions_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          amount: number
          company_id: string
          component_name: string
          component_type: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          payroll_component_id: string | null
          payroll_run_id: string
          source_attendance_id: string | null
          source_expense_claim_id: string | null
          source_leave_request_id: string | null
          source_loan_installment_id: string | null
          source_overtime_id: string | null
        }
        Insert: {
          amount: number
          company_id: string
          component_name: string
          component_type: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          payroll_component_id?: string | null
          payroll_run_id: string
          source_attendance_id?: string | null
          source_expense_claim_id?: string | null
          source_leave_request_id?: string | null
          source_loan_installment_id?: string | null
          source_overtime_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          component_name?: string
          component_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payroll_component_id?: string | null
          payroll_run_id?: string
          source_attendance_id?: string | null
          source_expense_claim_id?: string | null
          source_leave_request_id?: string | null
          source_loan_installment_id?: string | null
          source_overtime_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_component_id_fkey"
            columns: ["payroll_component_id"]
            isOneToOne: false
            referencedRelation: "payroll_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_source_attendance_id_fkey"
            columns: ["source_attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_source_expense_claim_id_fkey"
            columns: ["source_expense_claim_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_source_leave_request_id_fkey"
            columns: ["source_leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_source_loan_installment_id_fkey"
            columns: ["source_loan_installment_id"]
            isOneToOne: false
            referencedRelation: "loan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_source_overtime_id_fkey"
            columns: ["source_overtime_id"]
            isOneToOne: false
            referencedRelation: "overtime_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          company_id: string
          created_at: string
          id: string
          label: string
          period_end: string
          period_start: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          label: string
          period_end: string
          period_start: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          payroll_period_id: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          payroll_period_id: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          payroll_period_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_review_kpi_scores: {
        Row: {
          company_id: string
          computed_value: number | null
          created_at: string
          id: string
          kpi_definition_id: string
          notes: string | null
          performance_review_id: string
          score: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          computed_value?: number | null
          created_at?: string
          id?: string
          kpi_definition_id: string
          notes?: string | null
          performance_review_id: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          computed_value?: number | null
          created_at?: string
          id?: string
          kpi_definition_id?: string
          notes?: string | null
          performance_review_id?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_review_kpi_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_review_kpi_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "performance_review_kpi_scores_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_review_kpi_scores_performance_review_id_fkey"
            columns: ["performance_review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          comments: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          overall_rating: number | null
          review_cycle_id: string | null
          reviewer_id: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          comments?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          overall_rating?: number | null
          review_cycle_id?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          comments?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          overall_rating?: number | null
          review_cycle_id?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_review_cycle_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      policy_search_misses: {
        Row: {
          best_similarity: number | null
          company_id: string
          created_at: string
          id: string
          query: string
          user_id: string | null
        }
        Insert: {
          best_similarity?: number | null
          company_id: string
          created_at?: string
          id?: string
          query: string
          user_id?: string | null
        }
        Update: {
          best_similarity?: number | null
          company_id?: string
          created_at?: string
          id?: string
          query?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_search_misses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_search_misses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "policy_search_misses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_tax_slabs: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          fixed_amount: number
          id: string
          max_annual_income: number | null
          min_annual_income: number
          rate_percent: number
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          fixed_amount?: number
          id?: string
          max_annual_income?: number | null
          min_annual_income: number
          rate_percent?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_amount?: number
          id?: string
          max_annual_income?: number | null
          min_annual_income?: number
          rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_tax_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_tax_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_platform_admin: boolean
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          status?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      project_members: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          project_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          project_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "project_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          billable_default: boolean
          client_id: string | null
          company_id: string
          created_at: string
          description: string | null
          expected_completion_date: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          billable_default?: boolean
          client_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          expected_completion_date?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          billable_default?: boolean
          client_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          expected_completion_date?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      review_cycle_kpis: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kpi_definition_id: string
          review_cycle_id: string
          sort_order: number
          weight_override: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kpi_definition_id: string
          review_cycle_id: string
          sort_order?: number
          weight_override?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kpi_definition_id?: string
          review_cycle_id?: string
          sort_order?: number
          weight_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_cycle_kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycle_kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "review_cycle_kpis_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycle_kpis_review_cycle_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          company_id: string
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          cycle_end: string
          cycle_start: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_system_role: boolean
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_system_role?: boolean
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_system_role?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      running_timers: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          project_id: string
          started_at: string
          task_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          project_id: string
          started_at?: string
          task_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          project_id?: string
          started_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "running_timers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "running_timers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "running_timers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "running_timers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "running_timers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "timesheet_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_bands: {
        Row: {
          company_id: string
          created_at: string
          designation_id: string
          id: string
          max_salary: number
          mid_salary: number
          min_salary: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          designation_id: string
          id?: string
          max_salary: number
          mid_salary: number
          min_salary: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          designation_id?: string
          id?: string
          max_salary?: number
          mid_salary?: number
          min_salary?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_bands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_bands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "salary_bands_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_inquiries: {
        Row: {
          company_name: string
          created_at: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          status: string
          team_size: string | null
          work_email: string
        }
        Insert: {
          company_name: string
          created_at?: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
          team_size?: string | null
          work_email: string
        }
        Update: {
          company_name?: string
          created_at?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
          team_size?: string | null
          work_email?: string
        }
        Relationships: []
      }
      shift_assignment_history: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          reason: string | null
          shift_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          reason?: string | null
          shift_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          reason?: string | null
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "shift_assignment_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignment_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignment_history_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          company_id: string
          created_at: string
          end_time: string
          grace_period_minutes: number
          id: string
          name: string
          overtime_eligible: boolean
          start_time: string
          status: string
          working_days: string[]
        }
        Insert: {
          break_minutes?: number
          company_id: string
          created_at?: string
          end_time: string
          grace_period_minutes?: number
          id?: string
          name: string
          overtime_eligible?: boolean
          start_time: string
          status?: string
          working_days?: string[]
        }
        Update: {
          break_minutes?: number
          company_id?: string
          created_at?: string
          end_time?: string
          grace_period_minutes?: number
          id?: string
          name?: string
          overtime_eligible?: boolean
          start_time?: string
          status?: string
          working_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      statutory_rates: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          rate_percent: number
          rate_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          rate_percent: number
          rate_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          rate_percent?: number
          rate_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "statutory_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statutory_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      support_message_drafts: {
        Row: {
          body: string
          created_at: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_message_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_ai_generated: boolean
          sender_is_platform_admin: boolean
          sender_profile_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          sender_is_platform_admin?: boolean
          sender_profile_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          sender_is_platform_admin?: boolean
          sender_profile_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_draft_resolution: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          resolution: string | null
          status: string
          subject: string
        }
        Insert: {
          ai_draft_resolution?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          resolution?: string | null
          status?: string
          subject: string
        }
        Update: {
          ai_draft_resolution?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          resolution?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_slabs: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          fixed_amount: number
          id: string
          max_annual_income: number | null
          min_annual_income: number
          rate_percent: number
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          fixed_amount?: number
          id?: string
          max_annual_income?: number | null
          min_annual_income: number
          rate_percent: number
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_amount?: number
          id?: string
          max_annual_income?: number | null
          min_annual_income?: number
          rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean
          company_id: string
          created_at: string
          duration_minutes: number
          employee_id: string
          entry_date: string
          external_id: string | null
          id: string
          notes: string | null
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          submitted_by: string | null
          task_id: string | null
          timesheet_id: string | null
        }
        Insert: {
          billable?: boolean
          company_id: string
          created_at?: string
          duration_minutes: number
          employee_id: string
          entry_date: string
          external_id?: string | null
          id?: string
          notes?: string | null
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          task_id?: string | null
          timesheet_id?: string | null
        }
        Update: {
          billable?: boolean
          company_id?: string
          created_at?: string
          duration_minutes?: number
          employee_id?: string
          entry_date?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          task_id?: string | null
          timesheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "timesheet_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_tasks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billable_minutes: number
          company_id: string
          created_at: string
          employee_id: string
          id: string
          period_end: string
          period_start: string
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          total_minutes: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billable_minutes?: number
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          period_end: string
          period_start: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          total_minutes?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billable_minutes?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          period_end?: string
          period_start?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          total_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_attendance_monthly: {
        Row: {
          absent_days: number | null
          company_id: string | null
          employee_id: string | null
          late_days: number | null
          leave_days: number | null
          month: string | null
          overtime_minutes: number | null
          present_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      v_company_health: {
        Row: {
          company_id: string | null
          company_name: string | null
          employee_count: number | null
          is_demo: boolean | null
          last_payroll_run_at: string | null
          open_support_tickets: number | null
          pending_attendance_corrections: number | null
          pending_expense_claims: number | null
          pending_leave_requests: number | null
          plan: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          employee_count?: never
          is_demo?: boolean | null
          last_payroll_run_at?: never
          open_support_tickets?: never
          pending_attendance_corrections?: never
          pending_expense_claims?: never
          pending_leave_requests?: never
          plan?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          employee_count?: never
          is_demo?: boolean | null
          last_payroll_run_at?: never
          open_support_tickets?: never
          pending_attendance_corrections?: never
          pending_expense_claims?: never
          pending_leave_requests?: never
          plan?: string | null
          status?: string | null
        }
        Relationships: []
      }
      v_expense_summary: {
        Row: {
          category_name: string | null
          claim_count: number | null
          company_id: string | null
          month: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_headcount_by_department: {
        Row: {
          company_id: string | null
          department_name: string | null
          employee_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_leave_usage: {
        Row: {
          company_id: string | null
          employee_id: string | null
          entitled_days: number | null
          leave_type: string | null
          remaining_days: number | null
          used_days: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      v_payroll_run_summary: {
        Row: {
          company_id: string | null
          employee_count: number | null
          payroll_run_id: string | null
          period_label: string | null
          status: string | null
          total_deductions: number | null
          total_earnings: number | null
          total_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_health"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: undefined }
      auth_company_id: { Args: never; Returns: string }
      auth_employee_id: { Args: never; Returns: string }
      auth_has_permission: {
        Args: { p_action: string; p_resource: string }
        Returns: boolean
      }
      auth_is_platform_admin: { Args: never; Returns: boolean }
      auto_mark_daily_attendance: { Args: never; Returns: undefined }
      calculate_employee_settlement: {
        Args: {
          p_employee_id: string
          p_exit_date: string
          p_last_working_day?: string
          p_notes?: string
          p_notice_pay_adjustment?: number
        }
        Returns: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          exit_date: string
          finalized_at: string | null
          finalized_by: string | null
          gratuity_amount: number
          id: string
          last_working_day: string | null
          leave_encashment_amount: number
          loan_recovery_amount: number
          net_settlement_amount: number
          notes: string | null
          notice_pay_adjustment: number
          other_adjustments: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "employee_settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_income_tax: {
        Args: {
          p_company_id: string
          p_monthly_taxable_income: number
          p_period_date: string
        }
        Returns: number
      }
      calculate_professional_tax: {
        Args: {
          p_company_id: string
          p_monthly_taxable_income: number
          p_period_date: string
        }
        Returns: number
      }
      check_expiring_documents: { Args: never; Returns: undefined }
      check_payroll_reminders: { Args: never; Returns: undefined }
      convert_candidate_to_employee: {
        Args: { p_application_id: string }
        Returns: string
      }
      create_company_and_claim_admin: {
        Args: { p_company_name: string; p_company_slug: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_body: string
          p_company_id: string
          p_link?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      delete_clickup_token: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      employee_clock_in: {
        Args: {
          p_accuracy_m?: number
          p_lat?: number
          p_lng?: number
          p_photo_path?: string
        }
        Returns: {
          attendance_date: string
          check_in: string | null
          check_in_accuracy_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out: string | null
          check_out_accuracy_m: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          company_id: string
          created_at: string
          created_by: string | null
          early_departure_minutes: number
          employee_id: string
          id: string
          late_minutes: number
          leave_request_id: string | null
          notes: string | null
          overtime_minutes: number
          shift_id: string | null
          source: string
          status: string | null
          updated_at: string
          worked_minutes: number
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      employee_clock_out: {
        Args: {
          p_accuracy_m?: number
          p_lat?: number
          p_lng?: number
          p_photo_path?: string
        }
        Returns: {
          attendance_date: string
          check_in: string | null
          check_in_accuracy_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out: string | null
          check_out_accuracy_m: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          company_id: string
          created_at: string
          created_by: string | null
          early_departure_minutes: number
          employee_id: string
          id: string
          late_minutes: number
          leave_request_id: string | null
          notes: string | null
          overtime_minutes: number
          shift_id: string | null
          source: string
          status: string | null
          updated_at: string
          worked_minutes: number
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_employee_settlement: {
        Args: { p_settlement_id: string }
        Returns: undefined
      }
      finalize_payroll_run: {
        Args: { p_payroll_run_id: string }
        Returns: undefined
      }
      get_attendance_anomalies: {
        Args: { p_company_id: string; p_days_back?: number }
        Returns: {
          attendance_date: string
          employee_id: string
          employee_name: string
          issue: string
        }[]
      }
      get_attendance_anomalies_internal: {
        Args: { p_company_id: string; p_days_back?: number }
        Returns: {
          attendance_date: string
          employee_id: string
          employee_name: string
          issue: string
        }[]
      }
      get_attrition_risk_signals: {
        Args: { p_company_id: string }
        Returns: {
          employee_id: string
          employee_name: string
          signal: string
        }[]
      }
      get_attrition_risk_signals_internal: {
        Args: { p_company_id: string }
        Returns: {
          employee_id: string
          employee_name: string
          signal: string
        }[]
      }
      get_business_recommendations: {
        Args: { p_company_id: string; p_days_back?: number }
        Returns: {
          recommendation: string
          scenario: string
          signal_summary: string
          subject_id: string
          subject_label: string
          subject_type: string
        }[]
      }
      get_clickup_sync_trigger_secret: { Args: never; Returns: string }
      get_clickup_token: { Args: { p_company_id: string }; Returns: string }
      get_embed_trigger_secret: { Args: never; Returns: string }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          company_name: string
          email: string
          expires_at: string
          role_name: string
          status: string
        }[]
      }
      get_payroll_exceptions: {
        Args: { p_payroll_run_id: string }
        Returns: {
          employee_id: string
          employee_name: string
          issue: string
        }[]
      }
      get_payroll_exceptions_internal: {
        Args: { p_payroll_run_id: string }
        Returns: {
          employee_id: string
          employee_name: string
          issue: string
        }[]
      }
      get_support_draft_trigger_secret: { Args: never; Returns: string }
      is_company_working_day: {
        Args: { p_company_id: string; p_date: string; p_employee_id: string }
        Returns: boolean
      }
      link_employee_account: {
        Args: {
          p_company_slug: string
          p_employee_code: string
          p_personal_email: string
        }
        Returns: string
      }
      match_help_chunks: {
        Args: {
          match_company_id: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          similarity: number
          title: string
        }[]
      }
      next_employee_code: { Args: { p_company_id: string }; Returns: string }
      notify_permission_holders: {
        Args: {
          p_action: string
          p_body: string
          p_company_id: string
          p_link?: string
          p_resource: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      platform_delete_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      run_payroll_calculation: {
        Args: { p_payroll_run_id: string }
        Returns: undefined
      }
      send_ai_weekly_digest: { Args: never; Returns: undefined }
      send_transactional_email: {
        Args: { p_html: string; p_subject: string; p_to: string }
        Returns: undefined
      }
      set_clickup_token: {
        Args: { p_company_id: string; p_token: string }
        Returns: undefined
      }
      snapshot_company_metrics: { Args: never; Returns: undefined }
      sync_clickup_time_entries: { Args: never; Returns: undefined }
      update_my_employee_profile: {
        Args: {
          p_address?: string
          p_bank_account_number?: string
          p_bank_iban?: string
          p_bank_name?: string
          p_emergency_contact_name?: string
          p_emergency_contact_phone?: string
          p_personal_email?: string
          p_phone?: string
        }
        Returns: undefined
      }
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
