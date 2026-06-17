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
      employees: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          phone: string | null;
          role: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
          created_at: string;
          id: string;
          notes: string | null;
          order_id: string;
          product_id: string | null;
          product_name_snapshot: string | null;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          product_id?: string | null;
          product_name_snapshot?: string | null;
          quantity?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          product_id?: string | null;
          product_name_snapshot?: string | null;
          quantity?: number;
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
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          order_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          order_id: string;
          status: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          status?: string;
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
          created_at: string;
          customer_name: string | null;
          customer_phone: string | null;
          due_date: string | null;
          employee_id: string | null;
          id: string;
          notes: string | null;
          status: string;
          tracking_number: string;
          updated_at: string;
          workshop_id: string | null;
        };
        Insert: {
          created_at?: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          due_date?: string | null;
          employee_id?: string | null;
          id?: string;
          notes?: string | null;
          status: string;
          tracking_number: string;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Update: {
          created_at?: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          due_date?: string | null;
          employee_id?: string | null;
          id?: string;
          notes?: string | null;
          status?: string;
          tracking_number?: string;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Relationships: [
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
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["profile_role"] | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["profile_role"] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["profile_role"] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workshops: {
        Row: {
          address: string | null;
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
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
      profile_role: "super_admin" | "admin" | "employee";
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
