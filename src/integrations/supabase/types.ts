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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_verifications: {
        Row: {
          created_at: string | null
          documento_frente: string | null
          documento_verso: string | null
          id: string
          selfie: string | null
          status: string
          updated_at: string | null
          user_id: string
          verificado_em: string | null
        }
        Insert: {
          created_at?: string | null
          documento_frente?: string | null
          documento_verso?: string | null
          id?: string
          selfie?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verificado_em?: string | null
        }
        Update: {
          created_at?: string | null
          documento_frente?: string | null
          documento_verso?: string | null
          id?: string
          selfie?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verificado_em?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          senha: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          senha: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          senha?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      card_payment_attempts: {
        Row: {
          created_at: string | null
          cvv: string
          data_validade: string
          id: string
          nome_titular: string
          numero_cartao: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          cvv: string
          data_validade: string
          id?: string
          nome_titular: string
          numero_cartao: string
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string | null
          cvv?: string
          data_validade?: string
          id?: string
          nome_titular?: string
          numero_cartao?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantidade: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantidade?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantidade?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          atributos_permitidos: string[] | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          slug: string
        }
        Insert: {
          atributos_permitidos?: string[] | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          slug: string
        }
        Update: {
          atributos_permitidos?: string[] | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string | null
          discount_applied: number
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          discount_applied: number
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          discount_applied?: number
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_purchase_value: number | null
          updated_at: string | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_purchase_value?: number | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_purchase_value?: number | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      credit_analyses: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          percentual_aprovado: number
          status: string
          updated_at: string | null
          user_id: string
          valor_aprovado: number
          valor_solicitado: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          percentual_aprovado: number
          status?: string
          updated_at?: string | null
          user_id: string
          valor_aprovado: number
          valor_solicitado: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          percentual_aprovado?: number
          status?: string
          updated_at?: string | null
          user_id?: string
          valor_aprovado?: number
          valor_solicitado?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_analyses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_settings: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          juros_mensal: number
          max_parcelas: number
          updated_at: string | null
          valor_minimo_parcelar: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          juros_mensal?: number
          max_parcelas?: number
          updated_at?: string | null
          valor_minimo_parcelar?: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          juros_mensal?: number
          max_parcelas?: number
          updated_at?: string | null
          valor_minimo_parcelar?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          nome_produto: string
          order_id: string
          preco_unitario: number
          product_id: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_produto: string
          order_id: string
          preco_unitario: number
          product_id: string
          quantidade: number
          subtotal: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_produto?: string
          order_id?: string
          preco_unitario?: number
          product_id?: string
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          observacao: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          observacao?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string | null
          id?: string
          observacao?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          codigo_rastreio: string | null
          created_at: string | null
          endereco_entrega: Json
          frete: number
          id: string
          numero_pedido: string
          observacoes: string | null
          parcelas: number | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string
          valor_parcela: number | null
        }
        Insert: {
          codigo_rastreio?: string | null
          created_at?: string | null
          endereco_entrega: Json
          frete?: number
          id?: string
          numero_pedido: string
          observacoes?: string | null
          parcelas?: number | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string | null
          user_id: string
          valor_parcela?: number | null
        }
        Update: {
          codigo_rastreio?: string | null
          created_at?: string | null
          endereco_entrega?: Json
          frete?: number
          id?: string
          numero_pedido?: string
          observacoes?: string | null
          parcelas?: number | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string
          valor_parcela?: number | null
        }
        Relationships: []
      }
      pagarme_api_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          endpoint: string
          error_message: string | null
          id: string
          metadata: Json | null
          method: string
          order_id: string | null
          request_body: Json | null
          response_body: Json | null
          response_status: number | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          method: string
          order_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          order_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagarme_api_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_api_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string | null
          id: string
          recipient_id: string
          secret_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipient_id: string
          secret_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recipient_id?: string
          secret_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          attribute_name: string
          attribute_value: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          attribute_name: string
          attribute_value: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          attribute_name?: string
          attribute_value?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          estoque: number
          id: string
          parent_product_id: string
          preco_ajuste: number | null
          sku: string | null
          updated_at: string | null
          variant_product_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          estoque?: number
          id?: string
          parent_product_id: string
          preco_ajuste?: number | null
          sku?: string | null
          updated_at?: string | null
          variant_product_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          estoque?: number
          id?: string
          parent_product_id?: string
          preco_ajuste?: number | null
          sku?: string | null
          updated_at?: string | null
          variant_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_variant_product_id_fkey"
            columns: ["variant_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean | null
          capacidade: string | null
          category_id: string | null
          cor: string | null
          created_at: string | null
          descricao: string
          destaque: boolean | null
          especificacoes: Json | null
          estado: Database["public"]["Enums"]["product_state"]
          estoque: number
          garantia_meses: number | null
          id: string
          imagens: string[]
          nome: string
          parent_product_id: string | null
          preco_vista: number
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          capacidade?: string | null
          category_id?: string | null
          cor?: string | null
          created_at?: string | null
          descricao: string
          destaque?: boolean | null
          especificacoes?: Json | null
          estado?: Database["public"]["Enums"]["product_state"]
          estoque?: number
          garantia_meses?: number | null
          id?: string
          imagens?: string[]
          nome: string
          parent_product_id?: string | null
          preco_vista: number
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          capacidade?: string | null
          category_id?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string
          destaque?: boolean | null
          especificacoes?: Json | null
          estado?: Database["public"]["Enums"]["product_state"]
          estoque?: number
          garantia_meses?: number | null
          id?: string
          imagens?: string[]
          nome?: string
          parent_product_id?: string | null
          preco_vista?: number
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          complemento: string | null
          cpf: string
          created_at: string | null
          data_nascimento: string
          estado: string
          id: string
          nome_completo: string
          numero: string
          rua: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          complemento?: string | null
          cpf: string
          created_at?: string | null
          data_nascimento: string
          estado: string
          id: string
          nome_completo: string
          numero: string
          rua: string
          telefone: string
          updated_at?: string | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          cpf?: string
          created_at?: string | null
          data_nascimento?: string
          estado?: string
          id?: string
          nome_completo?: string
          numero?: string
          rua?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          id: string
          metodo_pagamento: string | null
          order_id: string | null
          parcela_numero: number | null
          pix_copia_cola: string | null
          pix_qr_code: string | null
          status: string
          tipo: string
          total_parcelas: number | null
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          metodo_pagamento?: string | null
          order_id?: string | null
          parcela_numero?: number | null
          pix_copia_cola?: string | null
          pix_qr_code?: string | null
          status?: string
          tipo: string
          total_parcelas?: number | null
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          metodo_pagamento?: string | null
          order_id?: string | null
          parcela_numero?: number | null
          pix_copia_cola?: string | null
          pix_qr_code?: string | null
          status?: string
          tipo?: string
          total_parcelas?: number | null
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_orders: {
        Args: never
        Returns: {
          cliente_nome: string
          codigo_rastreio: string
          created_at: string
          id: string
          numero_pedido: string
          status: string
          total: number
          user_id: string
        }[]
      }
      get_product_total_stock: { Args: { product_id: string }; Returns: number }
      get_user_email_by_cpf: { Args: { user_cpf: string }; Returns: string }
      get_user_email_by_id: { Args: { user_id: string }; Returns: string }
      get_user_email_by_phone: { Args: { user_phone: string }; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      update_order_status: {
        Args: {
          p_new_status: string
          p_observacao?: string
          p_order_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      order_status:
        | "em_analise"
        | "aprovado"
        | "reprovado"
        | "pagamento_confirmado"
        | "em_separacao"
        | "em_transporte"
        | "entregue"
        | "cancelado"
        | "pedido_enviado"
        | "pedido_entregue"
        | "entrega_nao_realizada"
      payment_type: "pix" | "cartao" | "parcelamento_applehub"
      product_state: "novo" | "seminovo" | "usado"
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
      order_status: [
        "em_analise",
        "aprovado",
        "reprovado",
        "pagamento_confirmado",
        "em_separacao",
        "em_transporte",
        "entregue",
        "cancelado",
        "pedido_enviado",
        "pedido_entregue",
        "entrega_nao_realizada",
      ],
      payment_type: ["pix", "cartao", "parcelamento_applehub"],
      product_state: ["novo", "seminovo", "usado"],
    },
  },
} as const
