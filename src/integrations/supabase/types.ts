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
      ad_budget_recoveries: {
        Row: {
          amount_pkr: number
          created_at: string
          id: string
          plan_id: string
          purchase_id: string
          referral_id: string
          referred_id: string
          referrer_id: string
          reversed_at: string | null
          status: string
        }
        Insert: {
          amount_pkr: number
          created_at?: string
          id?: string
          plan_id: string
          purchase_id: string
          referral_id: string
          referred_id: string
          referrer_id: string
          reversed_at?: string | null
          status?: string
        }
        Update: {
          amount_pkr?: number
          created_at?: string
          id?: string
          plan_id?: string
          purchase_id?: string
          referral_id?: string
          referred_id?: string
          referrer_id?: string
          reversed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_budget_recoveries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_budget_recoveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_budget_recoveries_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_completions: {
        Row: {
          ad_id: string
          completed_at: string
          id: string
          reward: number
          user_id: string
        }
        Insert: {
          ad_id: string
          completed_at?: string
          id?: string
          reward?: number
          user_id: string
        }
        Update: {
          ad_id?: string
          completed_at?: string
          id?: string
          reward?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_completions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_view_sessions: {
        Row: {
          ad_id: string
          completed_at: string | null
          created_at: string
          id: string
          reward_amount_pkr: number
          started_at: string
          status: string
          user_id: string
          user_plan_id: string
        }
        Insert: {
          ad_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          reward_amount_pkr?: number
          started_at?: string
          status?: string
          user_id: string
          user_plan_id: string
        }
        Update: {
          ad_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          reward_amount_pkr?: number
          started_at?: string
          status?: string
          user_id?: string
          user_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_view_sessions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_sessions_user_plan_id_fkey"
            columns: ["user_plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_profit_ledger: {
        Row: {
          admin_user_id: string | null
          allocation_id: string
          created_at: string
          currency: string
          gross_amount: number
          id: string
          plan_id: string
          profit_amount: number
          profit_percentage: number
          purchase_id: string
          reference_id: string | null
          reversal_of: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          allocation_id: string
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          plan_id: string
          profit_amount: number
          profit_percentage: number
          purchase_id: string
          reference_id?: string | null
          reversal_of?: string | null
          status?: string
          transaction_type?: string
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          allocation_id?: string
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          plan_id?: string
          profit_amount?: number
          profit_percentage?: number
          purchase_id?: string
          reference_id?: string | null
          reversal_of?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profit_ledger_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profit_ledger_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "purchase_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profit_ledger_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profit_ledger_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profit_ledger_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "admin_profit_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      ads: {
        Row: {
          advertiser: string
          created_at: string
          description: string | null
          destination_url: string | null
          display_order: number
          duration_seconds: number
          id: string
          reward: number
          reward_enabled: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser: string
          created_at?: string
          description?: string | null
          destination_url?: string | null
          display_order?: number
          duration_seconds?: number
          id?: string
          reward?: number
          reward_enabled?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser?: string
          created_at?: string
          description?: string | null
          destination_url?: string | null
          display_order?: number
          duration_seconds?: number
          id?: string
          reward?: number
          reward_enabled?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      advertiser_revenue: {
        Row: {
          advertiser: string
          amount: number
          campaign: string
          id: string
          recorded_at: string
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          advertiser: string
          amount: number
          campaign: string
          id?: string
          recorded_at?: string
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          advertiser?: string
          amount?: number
          campaign?: string
          id?: string
          recorded_at?: string
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          admin_id: string | null
          amount: number | null
          created_at: string
          event_type: string
          id: string
          image_hash: string | null
          metadata: Json
          transaction_id: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          image_hash?: string | null
          metadata?: Json
          transaction_id: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          image_hash?: string | null
          metadata?: Json
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_methods: {
        Row: {
          account_number: string
          account_title: string
          icon_url: string | null
          id: string
          instructions: string
          is_active: boolean
          max_deposit_pkr: number | null
          min_deposit_pkr: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_number?: string
          account_title?: string
          icon_url?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          max_deposit_pkr?: number | null
          min_deposit_pkr?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_title?: string
          icon_url?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          max_deposit_pkr?: number | null
          min_deposit_pkr?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          image_hash: string | null
          method: string | null
          plan_id: string | null
          proof_url: string | null
          receipt_deleted_at: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string
          id?: string
          image_hash?: string | null
          method?: string | null
          plan_id?: string | null
          proof_url?: string | null
          receipt_deleted_at?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          image_hash?: string | null
          method?: string | null
          plan_id?: string | null
          proof_url?: string | null
          receipt_deleted_at?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          severity?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      impersonation_grants: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          token_digest: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          token_digest: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token_digest?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      indirect_referral_level_rates: {
        Row: {
          level: number
          percentage: number | null
          updated_at: string
        }
        Insert: {
          level: number
          percentage?: number | null
          updated_at?: string
        }
        Update: {
          level?: number
          percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          note: string | null
          reference_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_type: string
          id?: string
          note?: string | null
          reference_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          activity_rules: Json
          ad_budget_pct: number | null
          admin_profit_pct: number
          ads_per_day: number
          base_ad_reward_pkr: number
          created_at: string
          daily_ads: number
          daily_reward_limit_pkr: number
          description: string | null
          direct_referral_pct: number
          id: string
          indirect_referral_pct: number
          lifetime_access: boolean
          max_ad_reward_pkr: number
          max_lifetime_reward_pkr: number
          max_recovery_pkr: number | null
          min_deposit: number
          name: string
          platform_allocation_pct: number
          price_pkr: number
          recovery_fund_pct: number
          recovery_per_referral_pkr: number | null
          referral_enabled: boolean
          referrer_commission_pct: number
          reward_budget_pkr: number
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          activity_rules?: Json
          ad_budget_pct?: number | null
          admin_profit_pct?: number
          ads_per_day?: number
          base_ad_reward_pkr?: number
          created_at?: string
          daily_ads?: number
          daily_reward_limit_pkr?: number
          description?: string | null
          direct_referral_pct?: number
          id?: string
          indirect_referral_pct?: number
          lifetime_access?: boolean
          max_ad_reward_pkr?: number
          max_lifetime_reward_pkr?: number
          max_recovery_pkr?: number | null
          min_deposit?: number
          name: string
          platform_allocation_pct?: number
          price_pkr?: number
          recovery_fund_pct?: number
          recovery_per_referral_pkr?: number | null
          referral_enabled?: boolean
          referrer_commission_pct?: number
          reward_budget_pkr?: number
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          activity_rules?: Json
          ad_budget_pct?: number | null
          admin_profit_pct?: number
          ads_per_day?: number
          base_ad_reward_pkr?: number
          created_at?: string
          daily_ads?: number
          daily_reward_limit_pkr?: number
          description?: string | null
          direct_referral_pct?: number
          id?: string
          indirect_referral_pct?: number
          lifetime_access?: boolean
          max_ad_reward_pkr?: number
          max_lifetime_reward_pkr?: number
          max_recovery_pkr?: number | null
          min_deposit?: number
          name?: string
          platform_allocation_pct?: number
          price_pkr?: number
          recovery_fund_pct?: number
          recovery_per_referral_pkr?: number | null
          referral_enabled?: boolean
          referrer_commission_pct?: number
          reward_budget_pkr?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          plan_activated_at: string | null
          plan_id: string | null
          public_uid: string
          recovery_reserve_pkr: number
          referral_code: string | null
          referred_by: string | null
          role: string
          status: string
          username: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          plan_activated_at?: string | null
          plan_id?: string | null
          public_uid?: string
          recovery_reserve_pkr?: number
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          status?: string
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          plan_activated_at?: string | null
          plan_id?: string | null
          public_uid?: string
          recovery_reserve_pkr?: number
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          status?: string
          username?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      purchase_allocations: {
        Row: {
          ad_budget_amount: number
          admin_profit_amount: number
          created_at: string
          currency: string
          gross_amount: number
          id: string
          indirect_pool_amount_pkr: number
          indirect_pool_distributed_pkr: number
          plan_id: string
          purchase_id: string
          recovery_fund_amount: number
          referral_commission_amount: number
          user_id: string
        }
        Insert: {
          ad_budget_amount: number
          admin_profit_amount: number
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          indirect_pool_amount_pkr?: number
          indirect_pool_distributed_pkr?: number
          plan_id: string
          purchase_id: string
          recovery_fund_amount: number
          referral_commission_amount: number
          user_id: string
        }
        Update: {
          ad_budget_amount?: number
          admin_profit_amount?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          indirect_pool_amount_pkr?: number
          indirect_pool_distributed_pkr?: number
          plan_id?: string
          purchase_id?: string
          recovery_fund_amount?: number
          referral_commission_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_allocations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_allocations_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_fund_ledger: {
        Row: {
          amount_pkr: number
          created_at: string
          entry_type: string
          id: string
          note: string | null
          plan_id: string | null
          reference_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_pkr: number
          created_at?: string
          entry_type: string
          id?: string
          note?: string | null
          plan_id?: string | null
          reference_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_pkr?: number
          created_at?: string
          entry_type?: string
          id?: string
          note?: string | null
          plan_id?: string | null
          reference_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_fund_ledger_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
          percentage: number
          plan_id: string | null
          purchase_id: string | null
          referral_id: string | null
          reversal_of: string | null
          source: string
          source_user_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          level: number
          percentage?: number
          plan_id?: string | null
          purchase_id?: string | null
          referral_id?: string | null
          reversal_of?: string | null
          source: string
          source_user_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          level?: number
          percentage?: number
          plan_id?: string | null
          purchase_id?: string | null
          referral_id?: string | null
          reversal_of?: string | null
          source?: string
          source_user_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "referral_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          level?: number
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
      reward_ranges: {
        Row: {
          active: boolean
          activity_level: string
          id: string
          maximum_pkr: number
          minimum_pkr: number
          plan_id: string
        }
        Insert: {
          active?: boolean
          activity_level: string
          id?: string
          maximum_pkr: number
          minimum_pkr: number
          plan_id: string
        }
        Update: {
          active?: boolean
          activity_level?: string
          id?: string
          maximum_pkr?: number
          minimum_pkr?: number
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_ranges_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_rules: {
        Row: {
          active: boolean
          activity_score_required: number
          created_at: string
          id: string
          minimum_referrals: number
          plan_id: string | null
          reward_cap_pkr: number | null
          reward_multiplier: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          activity_score_required?: number
          created_at?: string
          id?: string
          minimum_referrals?: number
          plan_id?: string | null
          reward_cap_pkr?: number | null
          reward_multiplier?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          activity_score_required?: number
          created_at?: string
          id?: string
          minimum_referrals?: number
          plan_id?: string | null
          reward_cap_pkr?: number | null
          reward_multiplier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_transactions: {
        Row: {
          ad_id: string | null
          amount_pkr: number
          created_at: string
          daily_reward_after_pkr: number
          daily_reward_before_pkr: number
          id: string
          idempotency_key: string | null
          reserve_after_pkr: number
          reserve_before_pkr: number
          reward_type: string
          status: string
          user_id: string
          user_plan_id: string | null
        }
        Insert: {
          ad_id?: string | null
          amount_pkr: number
          created_at?: string
          daily_reward_after_pkr?: number
          daily_reward_before_pkr?: number
          id?: string
          idempotency_key?: string | null
          reserve_after_pkr: number
          reserve_before_pkr: number
          reward_type: string
          status?: string
          user_id: string
          user_plan_id?: string | null
        }
        Update: {
          ad_id?: string | null
          amount_pkr?: number
          created_at?: string
          daily_reward_after_pkr?: number
          daily_reward_before_pkr?: number
          id?: string
          idempotency_key?: string | null
          reserve_after_pkr?: number
          reserve_before_pkr?: number
          reward_type?: string
          status?: string
          user_id?: string
          user_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_transactions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_transactions_user_plan_id_fkey"
            columns: ["user_plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limit_config: {
        Row: {
          backoff_base_seconds: number
          backoff_max_seconds: number
          endpoint_type: string
          per_account_limit: number
          per_ip_limit: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          backoff_base_seconds: number
          backoff_max_seconds: number
          endpoint_type: string
          per_account_limit: number
          per_ip_limit: number
          updated_at?: string
          window_seconds: number
        }
        Update: {
          backoff_base_seconds?: number
          backoff_max_seconds?: number
          endpoint_type?: string
          per_account_limit?: number
          per_ip_limit?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      security_rate_limit_state: {
        Row: {
          attempts: number
          blocked_until: string | null
          key: string
          window_started_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          key: string
          window_started_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          message: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          message?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          message?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      task_sessions: {
        Row: {
          completed_at: string | null
          id: string
          required_seconds: number
          security_token: string
          started_at: string
          status: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          required_seconds?: number
          security_token?: string
          started_at?: string
          status?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          required_seconds?: number
          security_token?: string
          started_at?: string
          status?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          kind: string
          metadata: Json
          parent_transaction_id: string | null
          processed_at: string | null
          source_id: string | null
          source_type: string | null
          status: string
          transaction_no: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          kind: string
          metadata?: Json
          parent_transaction_id?: string | null
          processed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          transaction_no?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          kind?: string
          metadata?: Json
          parent_transaction_id?: string | null
          processed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          transaction_no?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          ads_per_day: number
          base_ad_reward_pkr: number
          created_at: string
          daily_reward_date: string
          daily_reward_limit_pkr: number
          daily_reward_used_pkr: number
          direct_referral_allocation_pkr: number
          earning_rating_pct: number
          earning_rating_updated_at: string | null
          expires_at: string | null
          id: string
          indirect_referral_allocation_pkr: number
          lifetime_access: boolean
          max_ad_reward_pkr: number
          max_lifetime_reward_pkr: number
          original_reward_reserve_pkr: number
          plan_id: string | null
          plan_name_snapshot: string
          platform_allocation_pkr: number
          purchase_price_pkr: number
          purchased_at: string
          referral_enabled: boolean
          remaining_reward_budget_pkr: number
          reward_budget_pkr: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ads_per_day?: number
          base_ad_reward_pkr: number
          created_at?: string
          daily_reward_date?: string
          daily_reward_limit_pkr: number
          daily_reward_used_pkr?: number
          direct_referral_allocation_pkr?: number
          earning_rating_pct?: number
          earning_rating_updated_at?: string | null
          expires_at?: string | null
          id?: string
          indirect_referral_allocation_pkr?: number
          lifetime_access?: boolean
          max_ad_reward_pkr: number
          max_lifetime_reward_pkr?: number
          original_reward_reserve_pkr?: number
          plan_id?: string | null
          plan_name_snapshot: string
          platform_allocation_pkr?: number
          purchase_price_pkr: number
          purchased_at?: string
          referral_enabled?: boolean
          remaining_reward_budget_pkr: number
          reward_budget_pkr: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ads_per_day?: number
          base_ad_reward_pkr?: number
          created_at?: string
          daily_reward_date?: string
          daily_reward_limit_pkr?: number
          daily_reward_used_pkr?: number
          direct_referral_allocation_pkr?: number
          earning_rating_pct?: number
          earning_rating_updated_at?: string | null
          expires_at?: string | null
          id?: string
          indirect_referral_allocation_pkr?: number
          lifetime_access?: boolean
          max_ad_reward_pkr?: number
          max_lifetime_reward_pkr?: number
          original_reward_reserve_pkr?: number
          plan_id?: string | null
          plan_name_snapshot?: string
          platform_allocation_pkr?: number
          purchase_price_pkr?: number
          purchased_at?: string
          referral_enabled?: boolean
          remaining_reward_budget_pkr?: number
          reward_budget_pkr?: number
          status?: string
          updated_at?: string
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
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_withdrawal_methods: {
        Row: {
          created_at: string
          details: Json
          id: string
          method_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          method_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          method_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_withdrawal_methods_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          status: string
          transaction_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          transaction_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          transaction_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string
          currency: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_methods: {
        Row: {
          destination_label: string
          id: string
          instructions: string
          is_active: boolean
          max_withdrawal_pkr: number | null
          min_withdrawal_pkr: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          destination_label?: string
          id?: string
          instructions?: string
          is_active?: boolean
          max_withdrawal_pkr?: number | null
          min_withdrawal_pkr?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          destination_label?: string
          id?: string
          instructions?: string
          is_active?: boolean
          max_withdrawal_pkr?: number | null
          min_withdrawal_pkr?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account: string | null
          amount: number
          created_at: string
          fee: number | null
          hold_amount: number
          id: string
          method: string | null
          refunded_at: string | null
          request_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          account?: string | null
          amount: number
          created_at?: string
          fee?: number | null
          hold_amount?: number
          id?: string
          method?: string | null
          refunded_at?: string | null
          request_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account?: string | null
          amount?: number
          created_at?: string
          fee?: number | null
          hold_amount?: number
          id?: string
          method?: string | null
          refunded_at?: string | null
          request_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_ledger: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_adjust_user_reserve: {
        Args: { p_amount: number; p_reason: string; p_user_plan_id: string }
        Returns: {
          ads_per_day: number
          base_ad_reward_pkr: number
          created_at: string
          daily_reward_date: string
          daily_reward_limit_pkr: number
          daily_reward_used_pkr: number
          direct_referral_allocation_pkr: number
          earning_rating_pct: number
          earning_rating_updated_at: string | null
          expires_at: string | null
          id: string
          indirect_referral_allocation_pkr: number
          lifetime_access: boolean
          max_ad_reward_pkr: number
          max_lifetime_reward_pkr: number
          original_reward_reserve_pkr: number
          plan_id: string | null
          plan_name_snapshot: string
          platform_allocation_pkr: number
          purchase_price_pkr: number
          purchased_at: string
          referral_enabled: boolean
          remaining_reward_budget_pkr: number
          reward_budget_pkr: number
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_approve_deposit: {
        Args: {
          p_deposit_id: string
          p_next_status: string
          p_rejection_reason?: string
        }
        Returns: {
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          image_hash: string | null
          method: string | null
          plan_id: string | null
          proof_url: string | null
          receipt_deleted_at: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_broadcast_notification: {
        Args: { p_body: string; p_title: string }
        Returns: number
      }
      admin_dispatch_notification: {
        Args: { p_body: string; p_title: string; p_user_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_operations_overview: { Args: never; Returns: Json }
      admin_profit_ledger_page: { Args: never; Returns: Json[] }
      admin_profit_summary: { Args: never; Returns: Json }
      admin_remove_user: { Args: { p_user_id: string }; Returns: Json }
      admin_reply_support_ticket: {
        Args: { p_reply?: string; p_status: string; p_ticket_id: string }
        Returns: {
          category: string
          created_at: string
          description: string | null
          id: string
          message: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reserve_summary: {
        Args: never
        Returns: {
          plan_name: string
          total_original_reserve: number
          total_reserve_remaining: number
          total_reserve_used: number
          total_rewards_issued: number
          total_users: number
        }[]
      }
      admin_set_user_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: {
          created_at: string
          full_name: string | null
          id: string
          plan_activated_at: string | null
          plan_id: string | null
          public_uid: string
          recovery_reserve_pkr: number
          referral_code: string | null
          referred_by: string | null
          role: string
          status: string
          username: string | null
          verified: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_transition_withdrawal: {
        Args: { p_next_status: string; p_withdrawal_id: string }
        Returns: {
          account: string | null
          amount: number
          created_at: string
          fee: number | null
          hold_amount: number
          id: string
          method: string | null
          refunded_at: string | null
          request_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_use_recovery_fund: {
        Args: {
          p_amount: number
          p_reason?: string
          p_reference?: string
          p_target_user_id?: string
          p_usage_type: string
        }
        Returns: Json
      }
      admin_users_page: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          public_uid: string
          role: string
          status: string
          total_count: number
          username: string
        }[]
      }
      complete_ad: {
        Args: { p_ad_id: string }
        Returns: {
          ad_id: string
          completed_at: string
          id: string
          reward: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ad_completions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_ad_view: {
        Args: { p_idempotency_key: string; p_session_id: string }
        Returns: number
      }
      consume_rate_limit: {
        Args: {
          p_backoff_base_seconds?: number
          p_backoff_max_seconds?: number
          p_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: Json
      }
      distribute_indirect_referral_pool: {
        Args: { p_purchase_id: string }
        Returns: Json
      }
      generate_referral_code: { Args: never; Returns: string }
      get_referral_count: { Args: { p_referral_code: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: { uid: string }; Returns: boolean }
      next_random_public_uid: { Args: never; Returns: string }
      request_withdrawal: {
        Args: {
          p_account: string
          p_amount: number
          p_method: string
          p_request_key?: string
        }
        Returns: {
          account: string | null
          amount: number
          created_at: string
          fee: number | null
          hold_amount: number
          id: string
          method: string | null
          refunded_at: string | null
          request_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_approved_purchase: {
        Args: { p_purchase_id: string; p_reason?: string }
        Returns: Json
      }
      review_withdrawal: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: {
          account: string | null
          amount: number
          created_at: string
          fee: number | null
          hold_amount: number
          id: string
          method: string | null
          refunded_at: string | null
          request_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_ad_view: { Args: { p_ad_id: string }; Returns: string }
      submit_deposit: {
        Args: {
          p_amount: number
          p_method: string
          p_plan_id: string
          p_proof_url: string
          p_transaction_id: string
        }
        Returns: {
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          image_hash: string | null
          method: string | null
          plan_id: string | null
          proof_url: string | null
          receipt_deleted_at: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      write_audit_event: {
        Args: {
          p_admin?: string
          p_amount?: number
          p_event: string
          p_image_hash?: string
          p_metadata?: Json
          p_transaction: string
          p_user: string
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
