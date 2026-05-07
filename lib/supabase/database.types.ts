export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          plan_key: string | null
          white_label_level: number | null
          brand_name: string | null
          brand_logo_url: string | null
          accent_color: string | null
          portal_subdomain: string | null
          custom_domain: string | null
          hide_skail_branding: boolean | null
          email_from_name: string | null
          email_from_address: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          plan_key?: string | null
          white_label_level?: number | null
          brand_name?: string | null
          brand_logo_url?: string | null
          accent_color?: string | null
          portal_subdomain?: string | null
          custom_domain?: string | null
          hide_skail_branding?: boolean | null
          email_from_name?: string | null
          email_from_address?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          name?: string
          plan_key?: string | null
          white_label_level?: number | null
          brand_name?: string | null
          brand_logo_url?: string | null
          accent_color?: string | null
          portal_subdomain?: string | null
          custom_domain?: string | null
          hide_skail_branding?: boolean | null
          email_from_name?: string | null
          email_from_address?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string
          role_key: string
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id: string
          role_key?: string
          status?: string
          created_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          user_id?: string
          role_key?: string
          status?: string
          created_at?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          description: string | null
          icon: string | null
          is_locked: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          description?: string | null
          icon?: string | null
          is_locked?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          name?: string
          description?: string | null
          icon?: string | null
          is_locked?: boolean | null
          created_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      collection_fields: {
        Row: {
          id: string
          workspace_id: string | null
          collection_id: string | null
          name: string
          field_type: string
          semantic_role: string | null
          is_required: boolean | null
          is_locked: boolean | null
          is_system: boolean | null
          options_json: Json | null
          settings_json: Json | null
          position: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          collection_id?: string | null
          name: string
          field_type: string
          semantic_role?: string | null
          is_required?: boolean | null
          is_locked?: boolean | null
          is_system?: boolean | null
          options_json?: Json | null
          settings_json?: Json | null
          position?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          collection_id?: string | null
          name?: string
          field_type?: string
          semantic_role?: string | null
          is_required?: boolean | null
          is_locked?: boolean | null
          is_system?: boolean | null
          options_json?: Json | null
          settings_json?: Json | null
          position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      collection_records: {
        Row: {
          id: string
          workspace_id: string | null
          collection_id: string | null
          title: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          collection_id?: string | null
          title?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          collection_id?: string | null
          title?: string | null
          created_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      record_values: {
        Row: {
          id: string
          workspace_id: string | null
          record_id: string | null
          field_id: string | null
          value_json: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          record_id?: string | null
          field_id?: string | null
          value_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          record_id?: string | null
          field_id?: string | null
          value_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          id: string
          workspace_id: string | null
          parent_page_id: string | null
          title: string
          icon: string | null
          is_locked: boolean | null
          visibility_scope: string | null
          position: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          parent_page_id?: string | null
          title: string
          icon?: string | null
          is_locked?: boolean | null
          visibility_scope?: string | null
          position?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          parent_page_id?: string | null
          title?: string
          icon?: string | null
          is_locked?: boolean | null
          visibility_scope?: string | null
          position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      widgets: {
        Row: {
          id: string
          workspace_id: string | null
          page_id: string | null
          widget_type: string
          title: string | null
          data_source_type: string | null
          data_source_id: string | null
          config_json: Json | null
          position: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          page_id?: string | null
          widget_type: string
          title?: string | null
          data_source_type?: string | null
          data_source_id?: string | null
          config_json?: Json | null
          position?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          page_id?: string | null
          widget_type?: string
          title?: string | null
          data_source_type?: string | null
          data_source_id?: string | null
          config_json?: Json | null
          position?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      views: {
        Row: {
          id: string
          workspace_id: string | null
          collection_id: string | null
          name: string
          view_type: string
          config_json: Json | null
          is_locked: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          collection_id?: string | null
          name: string
          view_type?: string
          config_json?: Json | null
          is_locked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          collection_id?: string | null
          name?: string
          view_type?: string
          config_json?: Json | null
          is_locked?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      themes: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          mode: string
          is_default: boolean | null
          tokens_json: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          name: string
          mode?: string
          is_default?: boolean | null
          tokens_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          name?: string
          mode?: string
          is_default?: boolean | null
          tokens_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      page_style_settings: {
        Row: {
          id: string
          workspace_id: string | null
          page_id: string | null
          theme_id: string | null
          cover_image_url: string | null
          icon_type: string | null
          icon_value: string | null
          background_json: Json | null
          typography_json: Json | null
          layout_style_json: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          page_id?: string | null
          theme_id?: string | null
          cover_image_url?: string | null
          icon_type?: string | null
          icon_value?: string | null
          background_json?: Json | null
          typography_json?: Json | null
          layout_style_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          page_id?: string | null
          theme_id?: string | null
          cover_image_url?: string | null
          icon_type?: string | null
          icon_value?: string | null
          background_json?: Json | null
          typography_json?: Json | null
          layout_style_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      widget_style_settings: {
        Row: {
          id: string
          workspace_id: string | null
          widget_id: string | null
          style_json: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          widget_id?: string | null
          style_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          widget_id?: string | null
          style_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      view_style_settings: {
        Row: {
          id: string
          workspace_id: string | null
          view_id: string | null
          style_json: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          view_id?: string | null
          style_json?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          view_id?: string | null
          style_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_builder_previews: {
        Row: {
          id: string
          workspace_id: string | null
          created_by: string
          user_prompt: string
          status: string
          intent: string
          summary: string
          risk_level: string
          requires_confirmation: boolean
          plan_json: Json | null
          context_json: Json | null
          applied_operations_json: Json | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
          applied_at: string | null
          undone_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          created_by: string
          user_prompt: string
          status?: string
          intent: string
          summary: string
          risk_level: string
          requires_confirmation?: boolean
          plan_json?: Json | null
          context_json?: Json | null
          applied_operations_json?: Json | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          applied_at?: string | null
          undone_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          created_by?: string
          user_prompt?: string
          status?: string
          intent?: string
          summary?: string
          risk_level?: string
          requires_confirmation?: boolean
          plan_json?: Json | null
          context_json?: Json | null
          applied_operations_json?: Json | null
          error_message?: string | null
          updated_at?: string | null
          applied_at?: string | null
          undone_at?: string | null
        }
        Relationships: []
      }
      agent_instances: {
        Row: {
          id: string
          workspace_id: string | null
          agent_template_id: string | null
          display_name: string
          user_instructions: string | null
          is_enabled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          agent_template_id?: string | null
          display_name: string
          user_instructions?: string | null
          is_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string | null
          agent_template_id?: string | null
          display_name?: string
          user_instructions?: string | null
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

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
