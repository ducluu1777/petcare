export interface PetDraft {
  name: string;
  breed: string;
  weightKg: string;
  ageMonths: string;
  notes: string;
  hasVaccine: boolean;
}

export interface PetProfile {
  id: string;
  code: string;
  name: string;
  species: "Chó" | "Mèo";
  breed: string;
  weight: number | null;
  age: string;
  ownerName: string;
  ownerContact: string;
  ownerContactType: string;
  vaccinationStatus: "Có ghi nhận tiêm phòng" | "Chưa ghi nhận tiêm phòng";
  behaviorWarnings: string[];
  behavioralFlag?: "NORMAL" | "AGGRESSIVE" | "TIMID";
  totalBookings: number;
  recentBookings: Array<{
    id: string;
    code: string;
    scheduledAt: string;
    status: string;
    services: string[];
  }>;
  ageMonths?: number | null;
  notes?: string | null;
  hasVaccine: boolean;
  isArchived: boolean;
}
