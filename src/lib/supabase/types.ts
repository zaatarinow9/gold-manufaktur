export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          accent: string | null;
          created_at: string;
          description_ar: string | null;
          description_de: string | null;
          description_en: string | null;
          description_fr: string | null;
          description_tr: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name_ar: string;
          name_de: string;
          name_en: string | null;
          name_fr: string | null;
          name_tr: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          accent?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          description_fr?: string | null;
          description_tr?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name_ar: string;
          name_de: string;
          name_en?: string | null;
          name_fr?: string | null;
          name_tr?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          accent?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          description_fr?: string | null;
          description_tr?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name_ar?: string;
          name_de?: string;
          name_en?: string | null;
          name_fr?: string | null;
          name_tr?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          message: string;
          name: string;
          phone: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          message: string;
          name: string;
          phone?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      admin_notifications: {
        Row: {
          created_at: string;
          employee_id: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          is_read: boolean;
          link_path: string | null;
          message: string;
          metadata_json: Json;
          profile_id: string | null;
          read_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["admin_notification_type"];
          workshop_id: string | null;
        };
        Insert: {
          created_at?: string;
          employee_id?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          is_read?: boolean;
          link_path?: string | null;
          message: string;
          metadata_json?: Json;
          profile_id?: string | null;
          read_at?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["admin_notification_type"];
          workshop_id?: string | null;
        };
        Update: {
          created_at?: string;
          employee_id?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          is_read?: boolean;
          link_path?: string | null;
          message?: string;
          metadata_json?: Json;
          profile_id?: string | null;
          read_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["admin_notification_type"];
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_notifications_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_notifications_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_notifications_workshop_id_fkey";
            columns: ["workshop_id"];
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: {
          body_html: string | null;
          body_text: string | null;
          created_at: string;
          direction: string;
          error_message: string | null;
          id: string;
          metadata_json: Json;
          notification_id: string | null;
          order_id: string | null;
          provider: string;
          recipient_email: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["email_log_status"];
          subject: string;
          support_ticket_id: string | null;
        };
        Insert: {
          body_html?: string | null;
          body_text?: string | null;
          created_at?: string;
          direction?: string;
          error_message?: string | null;
          id?: string;
          metadata_json?: Json;
          notification_id?: string | null;
          order_id?: string | null;
          provider?: string;
          recipient_email: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_log_status"];
          subject: string;
          support_ticket_id?: string | null;
        };
        Update: {
          body_html?: string | null;
          body_text?: string | null;
          created_at?: string;
          direction?: string;
          error_message?: string | null;
          id?: string;
          metadata_json?: Json;
          notification_id?: string | null;
          order_id?: string | null;
          provider?: string;
          recipient_email?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_log_status"];
          subject?: string;
          support_ticket_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_logs_notification_id_fkey";
            columns: ["notification_id"];
            referencedRelation: "admin_notifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_logs_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_logs_support_ticket_id_fkey";
            columns: ["support_ticket_id"];
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          attendance_status: Database["public"]["Enums"]["attendance_status"];
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          notes: string | null;
          phone: string | null;
          profile_id: string | null;
          role: Database["public"]["Enums"]["employee_role"];
          shift_label: string | null;
          updated_at: string;
          workshop_id: string | null;
        };
        Insert: {
          attendance_status?: Database["public"]["Enums"]["attendance_status"];
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          notes?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          role?: Database["public"]["Enums"]["employee_role"];
          shift_label?: string | null;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Update: {
          attendance_status?: Database["public"]["Enums"]["attendance_status"];
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          notes?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          role?: Database["public"]["Enums"]["employee_role"];
          shift_label?: string | null;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_workshop_id_fkey";
            columns: ["workshop_id"];
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      option_groups: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          key: string;
          name_ar: string;
          name_de: string;
          name_en: string | null;
          name_fr: string | null;
          name_tr: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key: string;
          name_ar: string;
          name_de: string;
          name_en?: string | null;
          name_fr?: string | null;
          name_tr?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key?: string;
          name_ar?: string;
          name_de?: string;
          name_en?: string | null;
          name_fr?: string | null;
          name_tr?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      options: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          is_active: boolean;
          is_required: boolean;
          key: string;
          label_ar: string;
          label_de: string;
          label_en: string | null;
          label_fr: string | null;
          label_tr: string | null;
          sort_order: number;
          type: Database["public"]["Enums"]["option_type"];
          updated_at: string;
          values_json: Json;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          key: string;
          label_ar: string;
          label_de: string;
          label_en?: string | null;
          label_fr?: string | null;
          label_tr?: string | null;
          sort_order?: number;
          type: Database["public"]["Enums"]["option_type"];
          updated_at?: string;
          values_json?: Json;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          key?: string;
          label_ar?: string;
          label_de?: string;
          label_en?: string | null;
          label_fr?: string | null;
          label_tr?: string | null;
          sort_order?: number;
          type?: Database["public"]["Enums"]["option_type"];
          updated_at?: string;
          values_json?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "options_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "option_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          category_name_snapshot: string | null;
          category_slug_snapshot: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          order_id: string;
          product_image_snapshot: string | null;
          product_id: string | null;
          product_name_snapshot: string | null;
          product_sku_snapshot: string | null;
          product_slug_snapshot: string | null;
          quantity: number;
          reference_images_json: Json;
          selected_options_json: Json;
        };
        Insert: {
          category_name_snapshot?: string | null;
          category_slug_snapshot?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          product_image_snapshot?: string | null;
          product_id?: string | null;
          product_name_snapshot?: string | null;
          product_sku_snapshot?: string | null;
          product_slug_snapshot?: string | null;
          quantity?: number;
          reference_images_json?: Json;
          selected_options_json?: Json;
        };
        Update: {
          category_name_snapshot?: string | null;
          category_slug_snapshot?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          product_image_snapshot?: string | null;
          product_id?: string | null;
          product_name_snapshot?: string | null;
          product_sku_snapshot?: string | null;
          product_slug_snapshot?: string | null;
          quantity?: number;
          reference_images_json?: Json;
          selected_options_json?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_events: {
        Row: {
          actor_name: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_public: boolean;
          note: string | null;
          notify_customer: boolean;
          order_id: string;
          status: Database["public"]["Enums"]["tracking_status"];
          title: string | null;
        };
        Insert: {
          actor_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          note?: string | null;
          notify_customer?: boolean;
          order_id: string;
          status: Database["public"]["Enums"]["tracking_status"];
          title?: string | null;
        };
        Update: {
          actor_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          note?: string | null;
          notify_customer?: boolean;
          order_id?: string;
          status?: Database["public"]["Enums"]["tracking_status"];
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_events_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_events_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          archived_at: string | null;
          assigned_admin_id: string | null;
          attachments_json: Json;
          currency: string;
          created_at: string;
          customer_email: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_reference: string | null;
          due_date: string | null;
          employee_id: string | null;
          email_updates_enabled: boolean;
          gold_details_json: Json;
          id: string;
          internal_order_number: string | null;
          measurements_json: Json;
          notes: string | null;
          notes_json: Json;
          personalization_json: Json;
          priority: Database["public"]["Enums"]["order_priority"];
          public_tracking_stage: string | null;
          status: Database["public"]["Enums"]["workshop_order_status"];
          stones_json: Json;
          total_amount: number | null;
          tracking_status: Database["public"]["Enums"]["tracking_status"];
          tracking_number: string;
          updated_at: string;
          workshop_id: string | null;
        };
        Insert: {
          archived_at?: string | null;
          assigned_admin_id?: string | null;
          attachments_json?: Json;
          currency?: string;
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_reference?: string | null;
          due_date?: string | null;
          employee_id?: string | null;
          email_updates_enabled?: boolean;
          gold_details_json?: Json;
          id?: string;
          internal_order_number?: string | null;
          measurements_json?: Json;
          notes?: string | null;
          notes_json?: Json;
          personalization_json?: Json;
          priority?: Database["public"]["Enums"]["order_priority"];
          public_tracking_stage?: string | null;
          status: Database["public"]["Enums"]["workshop_order_status"];
          stones_json?: Json;
          total_amount?: number | null;
          tracking_status?: Database["public"]["Enums"]["tracking_status"];
          tracking_number: string;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          assigned_admin_id?: string | null;
          attachments_json?: Json;
          currency?: string;
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_reference?: string | null;
          due_date?: string | null;
          employee_id?: string | null;
          email_updates_enabled?: boolean;
          gold_details_json?: Json;
          id?: string;
          internal_order_number?: string | null;
          measurements_json?: Json;
          notes?: string | null;
          notes_json?: Json;
          personalization_json?: Json;
          priority?: Database["public"]["Enums"]["order_priority"];
          public_tracking_stage?: string | null;
          status?: Database["public"]["Enums"]["workshop_order_status"];
          stones_json?: Json;
          total_amount?: number | null;
          tracking_status?: Database["public"]["Enums"]["tracking_status"];
          tracking_number?: string;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_assigned_admin_id_fkey";
            columns: ["assigned_admin_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_workshop_id_fkey";
            columns: ["workshop_id"];
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          image_url: string;
          product_id: string;
          sort_order: number;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          product_id: string;
          sort_order?: number;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          product_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          created_at: string;
          is_required: boolean;
          option_id: string;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          is_required?: boolean;
          option_id: string;
          product_id: string;
        };
        Update: {
          created_at?: string;
          is_required?: boolean;
          option_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_options_option_id_fkey";
            columns: ["option_id"];
            referencedRelation: "options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          cover_image_url: string | null;
          created_at: string;
          description_ar: string | null;
          description_de: string | null;
          description_en: string | null;
          description_fr: string | null;
          description_tr: string | null;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          name_ar: string;
          name_de: string;
          name_en: string | null;
          name_fr: string | null;
          name_tr: string | null;
          sku: string;
          slug: string;
          sort_order: number;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          description_fr?: string | null;
          description_tr?: string | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name_ar: string;
          name_de: string;
          name_en?: string | null;
          name_fr?: string | null;
          name_tr?: string | null;
          sku: string;
          slug: string;
          sort_order?: number;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          description_fr?: string | null;
          description_tr?: string | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name_ar?: string;
          name_de?: string;
          name_en?: string | null;
          name_fr?: string | null;
          name_tr?: string | null;
          sku?: string;
          slug?: string;
          sort_order?: number;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          employee_id: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["profile_role"] | null;
          updated_at: string;
          workshop_id: string | null;
        };
        Insert: {
          created_at?: string;
          employee_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["profile_role"] | null;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Update: {
          created_at?: string;
          employee_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["profile_role"] | null;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_employee_id_fkey";
            columns: ["employee_id"];
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_workshop_id_fkey";
            columns: ["workshop_id"];
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          created_by_profile_id: string | null;
          customer_email: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          id: string;
          message: string;
          order_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          source: string;
          status: Database["public"]["Enums"]["support_ticket_status"];
          subject: string;
          tracking_number: string;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          created_by_profile_id?: string | null;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          id?: string;
          message: string;
          order_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["support_ticket_status"];
          subject: string;
          tracking_number: string;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          created_by_profile_id?: string | null;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          id?: string;
          message?: string;
          order_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["support_ticket_status"];
          subject?: string;
          tracking_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workshops: {
        Row: {
          address: string | null;
          code: string | null;
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          location: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          code?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          code?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      admin_notification_type:
        | "order_created"
        | "order_updated"
        | "ticket_created"
        | "ticket_updated"
        | "employee_created"
        | "employee_updated"
        | "workshop_created"
        | "workshop_updated"
        | "system";
      attendance_status: "present" | "absent" | "vacation" | "sick" | "late";
      email_log_status: "pending" | "sent" | "failed" | "skipped";
      employee_role: "admin" | "employee";
      option_type:
        | "text"
        | "textarea"
        | "number"
        | "select"
        | "multi_select"
        | "boolean"
        | "date"
        | "image"
        | "file";
      order_priority: "normal" | "urgent" | "express";
      profile_role: "super_admin" | "admin" | "employee";
      support_ticket_status: "open" | "in_progress" | "resolved" | "closed";
      tracking_status:
        | "created"
        | "sent_to_workshop"
        | "accepted_by_workshop"
        | "in_production"
        | "quality_check"
        | "ready_for_pickup"
        | "on_the_way"
        | "delivered_to_store"
        | "picked_up"
        | "completed"
        | "cancelled";
      workshop_order_status:
        | "draft"
        | "sent_to_workshop"
        | "accepted"
        | "assigned"
        | "in_production"
        | "quality_check"
        | "ready"
        | "delivered"
        | "cancelled"
        | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type TableName = keyof Database["public"]["Tables"];

export type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends TableName> =
  Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> =
  Database["public"]["Tables"][T]["Update"];
