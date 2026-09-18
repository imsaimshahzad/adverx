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
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          category: string
          description: string | null
          key: string
          label: string
          text_value: string | null
          updated_at: string
          updated_by: string | null
          value: number | null
        }
        Insert: {
          category?: string
          description?: string | null
          key: string
          label: string
          text_value?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number | null
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          label?: string
          text_value?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number | null
        }
        Relationships: []
      }
      advertiser_campaigns: {
        Row: {
          advertiser_id: string
          budget: number
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
        }
        Insert: {
          advertiser_id: string
          budget?: number
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_on?: string | null
        }
        Update: {
          advertiser_id?: string
          budget?: number
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_revenue: {
        Row: {
          advertiser_id: string
          campaign_id: string | null
          created_at: string
          currency: string
          gross_revenue: number
          id: string
          notes: string | null
          platform_revenue: number
          received_on: string
          reference: string | null
          status: Database["public"]["Enums"]["revenue_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          advertiser_id: string
          campaign_id?: string | null
          created_at?: string
          currency?: string
          gross_revenue: number
          id?: string
          notes?: string | null
          platform_revenue: number
          received_on?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["revenue_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          advertiser_id?: string
          campaign_id?: string | null
          created_at?: string
          currency?: string
          gross_revenue?: number
          id?: string
          notes?: string | null
          platform_revenue?: number
          received_on?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["revenue_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_revenue_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_revenue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          website?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      deposit_methods: {
        Row: {
          account_number: string
          account_title: string
          id: string
          instructions: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          account_number: string
          account_title: string
          id?: string
          instructions?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          account_number?: string
          account_title?: string
          id?: string
          instructions?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          currency: string
          id: string
          method_id: string | null
          plan_id: string | null
          proof_path: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          submitted_at: string
          transaction_reference: string
          user_id: string
        }
        Insert: {
          amount: number
          currency?: string
          id?: string
          method_id?: string | null
          plan_id?: string | null
          proof_path?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          submitted_at?: string
          transaction_reference: string
          user_id: string
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          method_id?: string | null
          plan_id?: string | null
          proof_path?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          submitted_at?: string
          transaction_reference?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "deposit_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          details: Json
          flag_type: string
          id: string
          resolution_note: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          daily_task_limit: number
          description: string
          duration_days: number
          id: string
          is_active: boolean
          min_withdrawal: number
          name: string
          price: number
          referral_eligible: boolean
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          daily_task_limit?: number
          description?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          min_withdrawal?: number
          name: string
          price?: number
          referral_eligible?: boolean
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          daily_task_limit?: number
          description?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          min_withdrawal?: number
          name?: string
          price?: number
          referral_eligible?: boolean
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string
          id: string
          phone: string | null
          referral_code: string
          referred_by: string | null
          risk_status: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id: string
          phone?: string | null
          referral_code: string
          referred_by?: string | null
          risk_status?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id?: string
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          risk_status?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          level: number
          qualifying_activity: string
          rate: number
          referred_id: string
          referrer_id: string
          source_transaction_id: string | null
          status: Database["public"]["Enums"]["tx_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          level: number
          qualifying_activity: string
          rate: number
          referred_id: string
          referrer_id: string
          source_transaction_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          level?: number
          qualifying_activity?: string
          rate?: number
          referred_id?: string
          referrer_id?: string
          source_transaction_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          created_at: string
          id: string
          reward: number
          session_id: string
          task_id: string
          transaction_id: string | null
          user_id: string
          watched_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          reward: number
          session_id: string
          task_id: string
          transaction_id?: string | null
          user_id: string
          watched_seconds: number
        }
        Update: {
          created_at?: string
          id?: string
          reward?: number
          session_id?: string
          task_id?: string
          transaction_id?: string | null
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "task_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sessions: {
        Row: {
          id: string
          ip_address: string | null
          reject_reason: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          submitted_at: string | null
          task_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          reject_reason?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          submitted_at?: string | null
          task_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          reject_reason?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          submitted_at?: string | null
          task_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          advertiser_id: string | null
          campaign_id: string | null
          category: string
          cooldown_minutes: number
          created_at: string
          daily_limit_per_user: number
          description: string
          ends_at: string | null
          global_completion_limit: number | null
          id: string
          required_watch_seconds: number
          reward: number
          starts_at: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          verification_method: string
        }
        Insert: {
          advertiser_id?: string | null
          campaign_id?: string | null
          category?: string
          cooldown_minutes?: number
          created_at?: string
          daily_limit_per_user?: number
          description?: string
          ends_at?: string | null
          global_completion_limit?: number | null
          id?: string
          required_watch_seconds?: number
          reward: number
          starts_at?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          verification_method?: string
        }
        Update: {
          advertiser_id?: string | null
          campaign_id?: string | null
          category?: string
          cooldown_minutes?: number
          created_at?: string
          daily_limit_per_user?: number
          description?: string
          ends_at?: string | null
          global_completion_limit?: number | null
          id?: string
          required_watch_seconds?: number
          reward?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          fingerprint: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          fingerprint: string
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          fingerprint?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          activated_at: string
          expires_at: string
          id: string
          is_active: boolean
          plan_id: string
          source_deposit_id: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          plan_id: string
          source_deposit_id?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          plan_id?: string
          source_deposit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          metadata: Json
          processed_at: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          metadata?: Json
          processed_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          metadata?: Json
          processed_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_methods: {
        Row: {
          destination_label: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          destination_label?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          destination_label?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          currency: string
          destination: string
          fee: number
          fee_transaction_id: string | null
          hold_transaction_id: string | null
          id: string
          method_id: string | null
          net_amount: number
          processed_at: string | null
          requested_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          amount: number
          currency?: string
          destination: string
          fee?: number
          fee_transaction_id?: string | null
          hold_transaction_id?: string | null
          id?: string
          method_id?: string | null
          net_amount?: number
          processed_at?: string | null
          requested_at?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          amount?: number
          currency?: string
          destination?: string
          fee?: number
          fee_transaction_id?: string | null
          hold_transaction_id?: string | null
          id?: string
          method_id?: string | null
          net_amount?: number
          processed_at?: string | null
          requested_at?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_fee_transaction_id_fkey"
            columns: ["fee_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_hold_transaction_id_fkey"
            columns: ["hold_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_methods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_plan: {
        Args: { _user: string }
        Returns: {
          daily_task_limit: number
          expires_at: string
          min_withdrawal: number
          name: string
          plan_id: string
        }[]
      }
      adjust_wallet: {
        Args: { _amount: number; _reason: string; _user: string }
        Returns: undefined
      }
      admin_overview: { Args: never; Returns: Json }
      complete_task_session: { Args: { _session_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _new: Json
          _old: Json
          _reason: string
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: { _body: string; _cat?: string; _title: string; _user: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: { _amount: number; _destination: string; _method_id: string }
        Returns: string
      }
      resolve_fraud_flag: {
        Args: { _id: string; _note: string }
        Returns: undefined
      }
      review_deposit: {
        Args: { _approve: boolean; _deposit_id: string; _note?: string }
        Returns: undefined
      }
      review_revenue: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: undefined
      }
      review_withdrawal: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: undefined
      }
      reward_pool_state: {
        Args: never
        Returns: {
          available_funds: number
          operations: number
          outstanding_liability: number
          pending_withdrawals: number
          referral_available: number
          referral_budget: number
          referral_liability: number
          reserve: number
          reward_available: number
          reward_budget: number
          reward_liability: number
          verified_revenue: number
        }[]
      }
      set_user_status: {
        Args: { _reason: string; _risk: string; _status: string; _user: string }
        Returns: undefined
      }
      setting_num: {
        Args: { _default?: number; _key: string }
        Returns: number
      }
      start_task_session: {
        Args: { _ip?: string; _task_id: string; _ua?: string }
        Returns: string
      }
      update_setting: {
        Args: { _key: string; _reason?: string; _value: number }
        Returns: undefined
      }
      wallet_state: {
        Args: { _user_id: string }
        Returns: {
          available: number
          locked: number
          pending: number
          today_earned: number
          total_earned: number
          total_withdrawn: number
        }[]
      }
    }
    Enums: {
      account_status:
        | "active"
        | "pending_verification"
        | "restricted"
        | "suspended"
        | "banned"
      app_role: "user" | "moderator" | "admin" | "super_admin"
      deposit_status: "pending" | "approved" | "rejected"
      revenue_status: "pending" | "verified" | "rejected"
      risk_level: "normal" | "watchlist" | "restricted" | "suspended" | "banned"
      session_status: "open" | "submitted" | "verified" | "rejected" | "expired"
      task_status: "draft" | "active" | "paused" | "completed" | "expired"
      tx_status: "pending" | "completed" | "failed" | "reversed" | "cancelled"
      tx_type:
        | "DEPOSIT"
        | "PLAN_ACTIVATION"
        | "TASK_REWARD"
        | "REFERRAL_REWARD"
        | "WITHDRAWAL"
        | "WITHDRAWAL_FEE"
        | "REFUND"
        | "REVERSAL"
        | "ADMIN_ADJUSTMENT"
      withdrawal_status:
        | "pending"
        | "under_review"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
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
      account_status: [
        "active",
        "pending_verification",
        "restricted",
        "suspended",
        "banned",
      ],
      app_role: ["user", "moderator", "admin", "super_admin"],
      deposit_status: ["pending", "approved", "rejected"],
      revenue_status: ["pending", "verified", "rejected"],
      risk_level: ["normal", "watchlist", "restricted", "suspended", "banned"],
      session_status: ["open", "submitted", "verified", "rejected", "expired"],
      task_status: ["draft", "active", "paused", "completed", "expired"],
      tx_status: ["pending", "completed", "failed", "reversed", "cancelled"],
      tx_type: [
        "DEPOSIT",
        "PLAN_ACTIVATION",
        "TASK_REWARD",
        "REFERRAL_REWARD",
        "WITHDRAWAL",
        "WITHDRAWAL_FEE",
        "REFUND",
        "REVERSAL",
        "ADMIN_ADJUSTMENT",
      ],
      withdrawal_status: [
        "pending",
        "under_review",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
