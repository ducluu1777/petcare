export type Species = "DOG" | "CAT";

export interface PriceTier {
  minWeight: number; // e.g. 0
  maxWeight: number; // e.g. 5
  price: number;     // e.g. 180000
  label: string;     // e.g. "Dưới 5kg"
}

export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: "bath" | "grooming" | "cat-spa";
  categoryLabel: string;
  durationMin: number;
  isPopular?: boolean;
  isSignature?: boolean;
  imageUrl: string;
  priceTiers: PriceTier[];
  includes: string[];
  speciesSupport: Species[];
  steps?: string[];
  notes?: string[];
  requiresVaccination?: boolean;
}


export interface ServiceAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
}

export interface PetProfile {
  id: string;
  name: string;
  species: Species;
  breed: string;
  weightKg: number;
  age: string;
  avatarUrl: string;
  notes?: string;
  lastGroomingDate?: string;
}

export interface TimeSlot {
  id: string;
  time: string; // e.g. "09:00", "10:30"
  period: "morning" | "afternoon";
  available: boolean;
  remainingSlots: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: "food" | "snack" | "care" | "accessory";
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  stock: number;
  reservedStock?: number;
  imageUrl: string;
  description: string;
  specifications: { label: string; value: string }[];
  rating: number;
  reviewCount: number;
  isBestSeller?: boolean;
  isNew?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Voucher {
  code: string;
  title: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minSpend: number;
  expiryDate: string;
  isAvailable: boolean;
}

export interface PointTransaction {
  id: string;
  date: string;
  amount: number; // +35 or -50
  type: "earn" | "redeem";
  description: string;
}

export interface BookingRecord {
  id: string;
  bookingCode: string;
  date: string;
  timeSlot: string;
  petName: string;
  petSpecies: Species;
  petWeight: number;
  services: string[];
  status: "CONFIRMED" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  isPaid: boolean;
}
