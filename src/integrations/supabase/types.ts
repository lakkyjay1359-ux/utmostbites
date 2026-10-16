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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      combos: {
        Row: {
          accent: string
          available: boolean
          id: string
          image_key: string | null
          items: string[]
          name: string
          price: number
          sort: number
          tagline: string
        }
        Insert: {
          accent?: string
          available?: boolean
          id?: string
          image_key?: string | null
          items?: string[]
          name: string
          price: number
          sort?: number
          tagline?: string
        }
        Update: {
          accent?: string
          available?: boolean
          id?: string
          image_key?: string | null
          items?: string[]
          name?: string
          price?: number
          sort?: number
          tagline?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          item_id: string | null
          item_type: string
          line_total: number
          name: string
          order_id: string
          qty: number
          unit_price: number
          variant: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          item_type: string
          line_total: number
          name: string
          order_id: string
          qty: number
          unit_price: number
          variant?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          item_type?: string
          line_total?: number
          name?: string
          order_id?: string
          qty?: number
          unit_price?: number
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string
          fulfillment: string
          id: string
          instructions: string | null
          location: string | null
          mpesa_checkout_request_id: string | null
          payment: string
          payment_ref: string | null
          payment_status: string
          phone: string
          status: Database["public"]["Enums"]["order_status"]
          stock_deducted: boolean
          total: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          fulfillment: string
          id?: string
          instructions?: string | null
          location?: string | null
          mpesa_checkout_request_id?: string | null
          payment: string
          payment_ref?: string | null
          payment_status?: string
          phone: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deducted?: boolean
          total: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          fulfillment?: string
          id?: string
          instructions?: string | null
          location?: string | null
          mpesa_checkout_request_id?: string | null
          payment?: string
          payment_ref?: string | null
          payment_status?: string
          phone?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deducted?: boolean
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          id: string
          product_id: string
          qty: number
          stock_item_id: string
        }
        Insert: {
          id?: string
          product_id: string
          qty: number
          stock_item_id: string
        }
        Update: {
          id?: string
          product_id?: string
          qty?: number
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          description: string
          id: string
          image_key: string | null
          name: string
          price: number
          sort: number
          variants: Json | null
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_key?: string | null
          name: string
          price: number
          sort?: number
          variants?: Json | null
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_key?: string | null
          name?: string
          price?: number
          sort?: number
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value?: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          created_at: string
          id: string
          last_restocked_at: string | null
          min_level: number
          name: string
          quantity: number
          supplier: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          min_level?: number
          name: string
          quantity?: number
          supplier?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          min_level?: number
          name?: string
          quantity?: number
          supplier?: string | null
          unit?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          change: number
          cost: number | null
          created_at: string
          id: string
          kind: string
          moved_on: string
          notes: string | null
          order_id: string | null
          stock_item_id: string
          supplier: string | null
        }
        Insert: {
          change: number
          cost?: number | null
          created_at?: string
          id?: string
          kind: string
          moved_on?: string
          notes?: string | null
          order_id?: string | null
          stock_item_id: string
          supplier?: string | null
        }
        Update: {
          change?: number
          cost?: number | null
          created_at?: string
          id?: string
          kind?: string
          moved_on?: string
          notes?: string | null
          order_id?: string | null
          stock_item_id?: string
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "Received"
        | "Preparing"
        | "Ready"
        | "Completed"
        | "Cancelled"
        | "Confirmed"
        | "Ready for Collection"
        | "Out for Delivery"
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
    Enums: {
      app_role: ["admin", "user"],
      order_status: [
        "Received",
        "Preparing",
        "Ready",
        "Completed",
        "Cancelled",
        "Confirmed",
        "Ready for Collection",
        "Out for Delivery",
      ],
    },
  },
} as const
