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
      agent_activity_logs: {
        Row: {
          agent_instance_id: string | null
          created_at: string | null
          event_type: string
          id: string
          payload_json: Json | null
          summary: string | null
          visibility_scope: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_instance_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          payload_json?: Json | null
          summary?: string | null
          visibility_scope?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_instance_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          payload_json?: Json | null
          summary?: string | null
          visibility_scope?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_logs_agent_instance_id_fkey"
            columns: ["agent_instance_id"]
            isOneToOne: false
            referencedRelation: "agent_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_instances: {
        Row: {
          agent_template_id: string | null
          created_at: string | null
          display_name: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_instructions: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_template_id?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_instructions?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_template_id?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_instructions?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_instances_agent_template_id_fkey"
            columns: ["agent_template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_templates: {
        Row: {
          allowed_actions_json: Json | null
          created_at: string | null
          default_instructions: string | null
          description: string | null
          id: string
          is_platform_agent: boolean | null
          locked_rules: string
          name: string
        }
        Insert: {
          allowed_actions_json?: Json | null
          created_at?: string | null
          default_instructions?: string | null
          description?: string | null
          id?: string
          is_platform_agent?: boolean | null
          locked_rules: string
          name: string
        }
        Update: {
          allowed_actions_json?: Json | null
          created_at?: string | null
          default_instructions?: string | null
          description?: string | null
          id?: string
          is_platform_agent?: boolean | null
          locked_rules?: string
          name?: string
        }
        Relationships: []
      }
      ai_builder_previews: {
        Row: {
          applied_at: string | null
          applied_operations_json: Json
          context_json: Json
          created_at: string | null
          created_by: string
          error_message: string | null
          id: string
          intent: string
          plan_json: Json
          requires_confirmation: boolean
          risk_level: string
          status: string
          summary: string
          undone_at: string | null
          updated_at: string | null
          user_prompt: string
          workspace_id: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_operations_json?: Json
          context_json?: Json
          created_at?: string | null
          created_by: string
          error_message?: string | null
          id?: string
          intent: string
          plan_json?: Json
          requires_confirmation?: boolean
          risk_level: string
          status?: string
          summary: string
          undone_at?: string | null
          updated_at?: string | null
          user_prompt: string
          workspace_id?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_operations_json?: Json
          context_json?: Json
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          id?: string
          intent?: string
          plan_json?: Json
          requires_confirmation?: boolean
          risk_level?: string
          status?: string
          summary?: string
          undone_at?: string | null
          updated_at?: string | null
          user_prompt?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_builder_previews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_fields: {
        Row: {
          archived_at: string | null
          collection_id: string | null
          created_at: string | null
          field_type: string
          formula_json: Json | null
          id: string
          is_locked: boolean | null
          is_required: boolean | null
          is_system: boolean | null
          name: string
          options_json: Json | null
          position: number | null
          semantic_role: string | null
          settings_json: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string | null
          field_type: string
          formula_json?: Json | null
          id?: string
          is_locked?: boolean | null
          is_required?: boolean | null
          is_system?: boolean | null
          name: string
          options_json?: Json | null
          position?: number | null
          semantic_role?: string | null
          settings_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string | null
          field_type?: string
          formula_json?: Json | null
          id?: string
          is_locked?: boolean | null
          is_required?: boolean | null
          is_system?: boolean | null
          name?: string
          options_json?: Json | null
          position?: number | null
          semantic_role?: string | null
          settings_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_fields_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_files: {
        Row: {
          created_at: string
          created_by: string | null
          external_url: string | null
          field_id: string
          filename: string
          id: string
          mime_type: string | null
          record_id: string
          size_bytes: number | null
          source: string
          storage_path: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          field_id: string
          filename: string
          id?: string
          mime_type?: string | null
          record_id: string
          size_bytes?: number | null
          source: string
          storage_path?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          field_id?: string
          filename?: string
          id?: string
          mime_type?: string | null
          record_id?: string
          size_bytes?: number | null
          source?: string
          storage_path?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      collection_record_links: {
        Row: {
          created_at: string
          id: string
          relation_id: string
          source_record_id: string
          target_record_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relation_id: string
          source_record_id: string
          target_record_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relation_id?: string
          source_record_id?: string
          target_record_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      collection_records: {
        Row: {
          archived_at: string | null
          collection_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_records_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_relations: {
        Row: {
          created_at: string
          id: string
          is_self_ref: boolean
          is_two_way: boolean
          source_field_id: string
          target_field_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_self_ref?: boolean
          is_two_way?: boolean
          source_field_id: string
          target_field_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_self_ref?: boolean
          is_two_way?: boolean
          source_field_id?: string
          target_field_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_locked: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_throttle: {
        Row: {
          id: string
          ip_hash: string
          submitted_at: string
          view_id: string
        }
        Insert: {
          id?: string
          ip_hash: string
          submitted_at?: string
          view_id: string
        }
        Update: {
          id?: string
          ip_hash?: string
          submitted_at?: string
          view_id?: string
        }
        Relationships: []
      }
      page_access_grants: {
        Row: {
          access_level: string
          accepted_at: string
          created_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          scope_id: string
          scope_type: string
          source_link_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_level: string
          accepted_at?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          scope_id: string
          scope_type: string
          source_link_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_level?: string
          accepted_at?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          scope_id?: string
          scope_type?: string
          source_link_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      page_documents: {
        Row: {
          content_json: Json
          created_at: string
          page_id: string
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          page_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          page_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: []
      }
      page_form_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          ip_hash: string | null
          submitted_by: string | null
          values_json: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          ip_hash?: string | null
          submitted_by?: string | null
          values_json: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          ip_hash?: string | null
          submitted_by?: string | null
          values_json?: Json
          workspace_id?: string
        }
        Relationships: []
      }
      page_forms: {
        Row: {
          block_id: string
          created_at: string
          description: string | null
          fields_json: Json
          id: string
          page_id: string
          submit_text: string
          success_message: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          description?: string | null
          fields_json?: Json
          id?: string
          page_id: string
          submit_text?: string
          success_message?: string
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          description?: string | null
          fields_json?: Json
          id?: string
          page_id?: string
          submit_text?: string
          success_message?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      page_share_events: {
        Row: {
          access_level: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          grant_id: string | null
          id: string
          link_id: string | null
          metadata_json: Json
          scope_id: string
          scope_type: string
          target_user_id: string | null
          workspace_id: string
        }
        Insert: {
          access_level?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          grant_id?: string | null
          id?: string
          link_id?: string | null
          metadata_json?: Json
          scope_id: string
          scope_type: string
          target_user_id?: string | null
          workspace_id: string
        }
        Update: {
          access_level?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          grant_id?: string | null
          id?: string
          link_id?: string | null
          metadata_json?: Json
          scope_id?: string
          scope_type?: string
          target_user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      page_share_links: {
        Row: {
          access_level: string
          created_at: string
          created_by: string | null
          id: string
          last_used_at: string | null
          link_type: string
          revoked_at: string | null
          scope_id: string
          scope_type: string
          token_hash: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_level: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          link_type: string
          revoked_at?: string | null
          scope_id: string
          scope_type: string
          token_hash: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          link_type?: string
          revoked_at?: string | null
          scope_id?: string
          scope_type?: string
          token_hash?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      page_stacks: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          name: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      page_style_settings: {
        Row: {
          background_json: Json | null
          cover_image_url: string | null
          created_at: string | null
          icon_type: string | null
          icon_value: string | null
          id: string
          layout_style_json: Json | null
          page_id: string | null
          theme_id: string | null
          typography_json: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          background_json?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          icon_type?: string | null
          icon_value?: string | null
          id?: string
          layout_style_json?: Json | null
          page_id?: string | null
          theme_id?: string | null
          typography_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          background_json?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          icon_type?: string | null
          icon_value?: string | null
          id?: string
          layout_style_json?: Json | null
          page_id?: string | null
          theme_id?: string | null
          typography_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          last_opened_at: string
          page_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          last_opened_at?: string
          page_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          last_opened_at?: string
          page_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          archived_at: string | null
          cover_image_url: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_locked: boolean | null
          last_edited_by: string | null
          parent_page_id: string | null
          position: number | null
          stack_id: string | null
          title: string
          updated_at: string | null
          visibility_scope: string | null
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          last_edited_by?: string | null
          parent_page_id?: string | null
          position?: number | null
          stack_id?: string | null
          title: string
          updated_at?: string | null
          visibility_scope?: string | null
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          last_edited_by?: string | null
          parent_page_id?: string | null
          position?: number | null
          stack_id?: string | null
          title?: string
          updated_at?: string | null
          visibility_scope?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      record_values: {
        Row: {
          created_at: string | null
          field_id: string | null
          id: string
          record_id: string | null
          updated_at: string | null
          value_json: Json | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          record_id?: string | null
          updated_at?: string | null
          value_json?: Json | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          record_id?: string | null
          updated_at?: string | null
          value_json?: Json | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          config_json: Json | null
          created_at: string | null
          id: string
          is_platform_template: boolean | null
          name: string
          template_type: string | null
          workspace_id: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          is_platform_template?: boolean | null
          name: string
          template_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          is_platform_template?: boolean | null
          name?: string
          template_type?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      themes: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          mode: string
          name: string
          tokens_json: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          mode?: string
          name: string
          tokens_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          mode?: string
          name?: string
          tokens_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      view_style_settings: {
        Row: {
          created_at: string | null
          id: string
          style_json: Json | null
          updated_at: string | null
          view_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          style_json?: Json | null
          updated_at?: string | null
          view_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          style_json?: Json | null
          updated_at?: string | null
          view_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      views: {
        Row: {
          archived_at: string | null
          collection_id: string | null
          config_json: Json | null
          created_at: string | null
          id: string
          is_locked: boolean | null
          name: string
          updated_at: string | null
          view_type: string
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          collection_id?: string | null
          config_json?: Json | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          name: string
          updated_at?: string | null
          view_type?: string
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          collection_id?: string | null
          config_json?: Json | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          name?: string
          updated_at?: string | null
          view_type?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload_json: Json | null
          source: string
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload_json?: Json | null
          source: string
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload_json?: Json | null
          source?: string
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      widget_style_settings: {
        Row: {
          created_at: string | null
          id: string
          style_json: Json | null
          updated_at: string | null
          widget_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          style_json?: Json | null
          updated_at?: string | null
          widget_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          style_json?: Json | null
          updated_at?: string | null
          widget_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      widgets: {
        Row: {
          config_json: Json | null
          created_at: string | null
          data_source_id: string | null
          data_source_type: string | null
          id: string
          page_id: string | null
          position: number | null
          title: string | null
          updated_at: string | null
          widget_type: string
          workspace_id: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          data_source_id?: string | null
          data_source_type?: string | null
          id?: string
          page_id?: string | null
          position?: number | null
          title?: string | null
          updated_at?: string | null
          widget_type: string
          workspace_id?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          data_source_id?: string | null
          data_source_type?: string | null
          id?: string
          page_id?: string | null
          position?: number | null
          title?: string | null
          updated_at?: string | null
          widget_type?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role_key: string
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_key?: string
          status?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role_key?: string
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          accent_color: string | null
          brand_logo_url: string | null
          brand_name: string | null
          created_at: string | null
          custom_domain: string | null
          email_from_address: string | null
          email_from_name: string | null
          hide_skail_branding: boolean | null
          id: string
          name: string
          plan_key: string | null
          portal_subdomain: string | null
          updated_at: string | null
          white_label_level: number | null
        }
        Insert: {
          accent_color?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          custom_domain?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          hide_skail_branding?: boolean | null
          id?: string
          name: string
          plan_key?: string | null
          portal_subdomain?: string | null
          updated_at?: string | null
          white_label_level?: number | null
        }
        Update: {
          accent_color?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          custom_domain?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          hide_skail_branding?: boolean | null
          id?: string
          name?: string
          plan_key?: string | null
          portal_subdomain?: string | null
          updated_at?: string | null
          white_label_level?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: { target_workspace: string }
        Returns: boolean
      }
      search_collection_records: {
        Args: {
          p_collection_id: string
          p_cursor_created_at: string | null
          p_cursor_id: string | null
          p_limit: number
          p_search: string | null
          p_title_field_id: string | null
          p_workspace_id: string
        }
        Returns: {
          archived_at: string
          collection_id: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
          workspace_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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

// ---------------------------------------------------------------------------
// Convenience aliases used throughout the codebase
// ---------------------------------------------------------------------------
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceMember =
  Database['public']['Tables']['workspace_members']['Row']
export type Collection = Database['public']['Tables']['collections']['Row']
export type CollectionField =
  Database['public']['Tables']['collection_fields']['Row']
export type CollectionRecord =
  Database['public']['Tables']['collection_records']['Row']
export type RecordValue = Database['public']['Tables']['record_values']['Row']
export type SitePage = Database['public']['Tables']['pages']['Row']
export type LayoutWidget = Database['public']['Tables']['widgets']['Row']
export type SavedView = Database['public']['Tables']['views']['Row']
export type Theme = Database['public']['Tables']['themes']['Row']
export type PageStyleSetting =
  Database['public']['Tables']['page_style_settings']['Row']
export type WidgetStyleSetting =
  Database['public']['Tables']['widget_style_settings']['Row']
export type ViewStyleSetting =
  Database['public']['Tables']['view_style_settings']['Row']
export type AiBuilderPreview =
  Database['public']['Tables']['ai_builder_previews']['Row']

// Pages engine v1
export type PageStack = Database['public']['Tables']['page_stacks']['Row']
export type PageDocument = Database['public']['Tables']['page_documents']['Row']
export type PageVisit = Database['public']['Tables']['page_visits']['Row']
export type PageForm = Database['public']['Tables']['page_forms']['Row']
export type PageFormSubmission =
  Database['public']['Tables']['page_form_submissions']['Row']
export type PageShareLink =
  Database['public']['Tables']['page_share_links']['Row']
export type PageAccessGrant =
  Database['public']['Tables']['page_access_grants']['Row']
export type PageShareEvent =
  Database['public']['Tables']['page_share_events']['Row']
