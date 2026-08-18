/**
 * Hand-authored subset of the generated Supabase types.
 * Regenerate the full version with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 *
 * Every table must carry `Relationships` and the schema must expose `Views` and
 * `Functions` — postgrest-js checks the shape structurally, and a table missing
 * `Relationships` silently resolves to `never` at every call site.
 */
export type UserRole = "owner" | "manager" | "cashier";
export type PaymentMethodDb = "cash" | "card" | "wholesale" | "mixed";
export type SaleStatus = "completed" | "voided";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type BranchRow = {
  id: string;
  org_id: string;
  name: string;
  code: string;
  currency: string;
  is_active: boolean;
  created_at: string;
};

type ProductRow = {
  id: string;
  org_id: string;
  sku: string;
  name: string;
  name_local: string | null;
  brand: string | null;
  category_id: string | null;
  supplier_id: string | null;
  cost_price: number;
  sale_price: number;
  wholesale_price: number | null;
  max_discount: number;
  single_discount: number;
  reorder_level: number;
  warranty_months: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type SaleRow = {
  id: string;
  org_id: string;
  branch_id: string;
  receipt_no: string;
  subtotal: number;
  discount_total: number;
  total: number;
  payment_method: PaymentMethodDb;
  cash_received: number | null;
  change_due: number | null;
  status: SaleStatus;
  client_uuid: string | null;
  created_at: string;
  customer_name: string | null;
  customer_mobile: string | null;
  employee: string | null;
}

/** Keyed records for every module store — see migrations 0005/0006. */
type AppCollectionRow = {
  org_id: string;
  collection: string;
  entity_id: string;
  data: Json;
  created_at: string;
  updated_at: string;
}

/** Single-document config per organization (settings, tenant/licence). */
type AppDocumentRow = {
  org_id: string;
  key: string;
  data: Json;
  updated_at: string;
}

export type StockDocType = "grn" | "return" | "damage";

/** GRN / return / damage document headers. */
type StockDocumentRow = {
  id: string;
  org_id: string;
  branch_id: string | null;
  type: StockDocType;
  party: string | null;
  reference: string | null;
  note: string | null;
  total: number;
  lines: Json;
  created_by: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      organizations: Table<
        OrganizationRow,
        { name: string; slug: string; id?: string }
      >;
      branches: Table<
        BranchRow,
        { org_id: string; name: string; code: string; id?: string }
      >;
      products: Table<
        ProductRow,
        Partial<ProductRow> & { org_id: string; sku: string; name: string }
      >;
      sales: Table<SaleRow>;
      sale_lines: Table<{
        id: string;
        sale_id: string;
        product_id: string;
        variant_id: string | null;
        name: string;
        unit_price: number;
        quantity: number;
        discount: number;
        line_total: number;
      }>;
      app_collections: Table<
        AppCollectionRow,
        { collection: string; entity_id: string; data: Json; org_id?: string }
      >;
      app_documents: Table<
        AppDocumentRow,
        { key: string; data: Json; org_id?: string }
      >;
      stock_documents: Table<
        StockDocumentRow,
        Partial<StockDocumentRow> & { type: StockDocType }
      >;
      platform_settings: Table<
        { key: string; data: Json; updated_at: string },
        { key: string; data: Json; updated_at?: string }
      >;
      categories: Table<{
        id: string;
        org_id: string;
        name: string;
      }>;
      profiles: Table<{
        id: string;
        org_id: string;
        role: string;
      }>;
      product_variants: Table<
        {
          id: string;
          org_id: string;
          product_id: string;
          sku: string;
          title: string;
          option1: string | null;
          option2: string | null;
          option3: string | null;
          sale_price: number | null;
          compare_at_price: number | null;
          cost_price: number | null;
          barcode: string | null;
          image_url: string | null;
          position: number;
          is_active: boolean;
        }
      >;
      variant_branch_stock: Table<{
        branch_id: string;
        variant_id: string;
        quantity: number;
        updated_at: string;
      }>;
      branch_stock: Table<{
        branch_id: string;
        product_id: string;
        quantity: number;
        expire_date: string | null;
        updated_at: string;
      }>;
    };
    Views: {
      reseller_licences: {
        Row: {
          org_id: string;
          org_name: string;
          onboarded_at: string | null;
          brand: Json | null;
          plan: string | null;
          expiry: string | null;
          branches: number | null;
          users: number | null;
          sales_count: number | null;
          sales_total: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_sale: {
        Args: { payload: Record<string, unknown> };
        Returns: Record<string, unknown>;
      };
      create_sale_internal: {
        Args: { p_org: string; p_actor: string | null; payload: Json };
        Returns: Record<string, unknown>;
      };
      whatsapp_resolve_org: {
        Args: { p_phone_number_id: string };
        Returns: string;
      };
      whatsapp_create_order: {
        Args: { p_phone_number_id: string; p_payload: Json };
        Returns: Record<string, unknown>;
      };
      get_sale: { Args: { p_sale: string }; Returns: Record<string, unknown> };
      adjust_stock: {
        Args: {
          p_branch: string;
          p_product: string;
          p_delta: number;
          p_note: string;
        };
        Returns: number;
      };
      storefront_product_variants: {
        Args: { p_host: string | null; p_slug: string | null; p_product: string };
        Returns: unknown;
      };
      update_sale_fulfillment: {
        Args: { p_sale: string; p_status: string };
        Returns: Record<string, unknown>;
      };
    };
  };
}
