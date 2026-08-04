// ─────────────────────────────────────────
//  DATABASE TYPES
//  Mirrors supabase/schema.sql
// ─────────────────────────────────────────

export type ScentFamilyName =
  | "fresh"
  | "floral"
  | "woody"
  | "citrus"
  | "sweet"
  | "aquatic"
  | "spicy"
  | "musky";

export interface ScentFamily {
  id: number;
  name: ScentFamilyName;
  label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
}

export interface Perfume {
  id: number;
  name: string;
  slug: string;
  collection: string;
  family_id: number | null;
  family_ids?: number[];
  mood: string | null;
  description: string | null;
  full_description: string | null;
  notes: string[];
  top_notes?: string[];
  middle_notes?: string[];
  base_notes?: string[];
  strength: string;
  longevity: string;
  usage_guide: string | null;
  image_url: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  family?: ScentFamily;
  sizes?: PerfumeSize[];
}

export interface PerfumeSize {
  id: number;
  perfume_id: number;
  size_ml: number;
  size_label: string;
  price: number;
  stock: number;
  is_active: boolean;
  product_stocks?: { stock_qty: number }[];
}

export interface CustomerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null; // Legacy, kept for fallback
  city: string | null;
  province: string | null;
  postal_code: string | null;
  region_code?: string | null; // Legacy
  maps_latitude?: number | null; // Legacy
  maps_longitude?: number | null; // Legacy
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: number;
  customer_id: string;
  label: string; // Rumah, Kantor, Utama, dll
  recipient_name: string;
  phone: string;
  full_address: string;
  region_code: string;
  maps_latitude: number | null;
  maps_longitude: number | null;
  is_default: boolean;
  created_at?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface Order {
  id: number;
  order_code: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: number;
  discount: number;
  total: number;
  unique_code?: number | null;
  shipping_cost?: number | null;
  courier_name?: string | null;
  waybill_number?: string | null;
  voucher_code: string | null;
  status: OrderStatus;
  payment_method: string | null;
  payment_method_id?: number | null;
  payment_status?: "unpaid" | "waiting_confirmation" | "paid" | "rejected" | null;
  paid_at?: string | null;
  payment_verified_at?: string | null;
  payment_proof?: string | null;
  midtrans_id: string | null;
  midtrans_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  perfume_id: number | null;
  size_id: number | null;
  perfume_name: string;
  size_label: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export type RequestStatus =
  | "baru"
  | "diproses"
  | "butuh_review"
  | "selesai"
  | "dibatalkan";

export interface CustomRequest {
  id: number;
  customer_id: string | null;
  customer_name: string | null;
  description: string;
  size_preference: string;
  reference_image: string | null;
  status: RequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: number;
  code: string;
  name: string;
  type: "percentage" | "nominal" | "free_shipping";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  coverage_area?: string | null;
  quota: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export interface HomepageSlider {
  id: number;
  title: string | null;
  description: string | null;
  image_url: string | null;
  button_text_1: string | null;
  button_link_1: string | null;
  button_text_2: string | null;
  button_link_2: string | null;
  overlay_opacity: number;
  sort_order: number;
  is_active: boolean;
}

// ─────────────────────────────────────────
//  CART (client-side, localStorage)
// ─────────────────────────────────────────

export interface CartItem {
  perfumeId: number;
  sizeId: number;
  perfumeName: string;
  perfumeSlug: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  familyName: string;
}

export interface Cart {
  items: CartItem[];
  voucherCode: string | null;
}

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMinPrice(sizes: PerfumeSize[] | undefined): number {
  if (!sizes || sizes.length === 0) return 0;
  return Math.min(...sizes.filter((s) => s.is_active).map((s) => s.price));
}

export function getTotalStock(sizes: PerfumeSize[] | undefined): number {
  if (!sizes || sizes.length === 0) return 0;
  return sizes.reduce((sum, s) => {
    if (s.product_stocks && s.product_stocks.length > 0) {
      return sum + s.product_stocks.reduce((acc, ps) => acc + ps.stock_qty, 0);
    }
    return sum + s.stock;
  }, 0);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
