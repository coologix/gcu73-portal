// GCU73 Portal - Database type definitions
// Matches the schema in supabase/migrations/001_initial.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Validation rules JSONB shape
// ---------------------------------------------------------------------------
export interface ValidationRules {
  min_length?: number
  max_length?: number
  pattern?: string
  min_value?: number
  max_value?: number
  max_file_size_mb?: number
  allowed_extensions?: string[]
}

// ---------------------------------------------------------------------------
// Row types (one interface per table)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'super_admin' | 'user'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Form {
  id: string
  title: string
  description: string
  slug: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  form_id: string
  field_type: 'text' | 'number' | 'date' | 'textarea' | 'media' | 'email' | 'password' | 'tel'
  label: string
  description: string | null
  placeholder: string | null
  is_required: boolean
  is_sensitive: boolean
  validation_rules: ValidationRules | null
  sort_order: number
  created_at: string
}

export interface Submission {
  id: string
  form_id: string
  user_id: string
  submitted_by: string
  status: 'draft' | 'submitted' | 'update_requested'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface SubmissionValue {
  id: string
  submission_id: string
  field_id: string
  value: string
  file_url: string | null
  file_name: string | null
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  email: string
  form_id: string
  token: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  invited_by: string
  expires_at: string
  completed_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string
  type: 'update_request' | 'info' | 'reminder' | 'system'
  title: string
  message: string
  form_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Database interface (Supabase-compatible)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          role?: 'admin' | 'super_admin' | 'user'
          avatar_url?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id'>>
      }
      forms: {
        Row: Form
        Insert: Omit<Form, 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
          id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Form, 'id'>>
      }
      form_fields: {
        Row: FormField
        Insert: Omit<FormField, 'id' | 'created_at' | 'is_required' | 'is_sensitive'> & {
          id?: string
          is_required?: boolean
          is_sensitive?: boolean
          description?: string | null
          placeholder?: string | null
          validation_rules?: ValidationRules | null
          created_at?: string
        }
        Update: Partial<Omit<FormField, 'id'>>
      }
      submissions: {
        Row: Submission
        Insert: Omit<Submission, 'id' | 'created_at' | 'updated_at' | 'status' | 'submitted_at'> & {
          id?: string
          status?: 'draft' | 'submitted' | 'update_requested'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Submission, 'id'>>
      }
      submission_values: {
        Row: SubmissionValue
        Insert: Omit<SubmissionValue, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          file_url?: string | null
          file_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<SubmissionValue, 'id'>>
      }
      invitations: {
        Row: Invitation
        Insert: Omit<Invitation, 'id' | 'created_at' | 'status' | 'completed_at'> & {
          id?: string
          status?: 'pending' | 'completed' | 'expired' | 'cancelled'
          completed_at?: string | null
          created_at?: string
        }
        Update: Partial<Omit<Invitation, 'id'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'read_at'> & {
          id?: string
          form_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Omit<Notification, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Shorthand to pull the Row type for any public table. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Insert type helper */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Update type helper */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Named insert type aliases
export type ProfileInsert = TablesInsert<'profiles'>
export type FormInsert = TablesInsert<'forms'>
export type FormFieldInsert = TablesInsert<'form_fields'>
export type SubmissionInsert = TablesInsert<'submissions'>
export type SubmissionValueInsert = TablesInsert<'submission_values'>
export type InvitationInsert = TablesInsert<'invitations'>
export type NotificationInsert = TablesInsert<'notifications'>

// Named update type aliases
export type ProfileUpdate = TablesUpdate<'profiles'>
export type FormUpdate = TablesUpdate<'forms'>
export type FormFieldUpdate = TablesUpdate<'form_fields'>
export type SubmissionUpdate = TablesUpdate<'submissions'>
export type SubmissionValueUpdate = TablesUpdate<'submission_values'>
export type InvitationUpdate = TablesUpdate<'invitations'>
export type NotificationUpdate = TablesUpdate<'notifications'>
