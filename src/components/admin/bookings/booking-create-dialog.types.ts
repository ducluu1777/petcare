import type { ServiceItem } from "@/hooks/use-services";
import type { UserListItem } from "@/hooks/use-users";

export type BookingCreateMode = "WALK_IN" | "APPOINTMENT";

export interface BookingCreateDialogProps {
  isNewBookingModalOpen: boolean;
  setIsNewBookingModalOpen: (open: boolean) => void;
  newBookingMode: BookingCreateMode;
  appointmentDate: Date;
  setAppointmentDate: React.Dispatch<React.SetStateAction<Date>>;
  setAppointmentTime: (time: string) => void;
  selectedAppointmentTime: string;
  requestedAppointmentTime: string;
  hasManuallySelectedAppointmentTime: boolean;
  canCheckAppointmentAvailability: boolean;
  availableAppointmentTimes: string[];
  appointmentAvailability: { isLoading: boolean; isError: boolean };
  selectedCustomer: UserListItem | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<UserListItem | null>>;
  customerUsers: UserListItem[];
  foundUsers: UserListItem[] | undefined;
  isSearchingPhone: boolean;
  customerDetail: UserListItem | undefined;
  walkInPhone: string;
  setWalkInPhone: React.Dispatch<React.SetStateAction<string>>;
  selectedPetId: string | null;
  setSelectedPetId: React.Dispatch<React.SetStateAction<string | null>>;
  walkInPetName: string;
  setWalkInPetName: React.Dispatch<React.SetStateAction<string>>;
  walkInSpecies: "DOG" | "CAT";
  setWalkInSpecies: React.Dispatch<React.SetStateAction<"DOG" | "CAT">>;
  walkInBreed: string;
  setWalkInBreed: React.Dispatch<React.SetStateAction<string>>;
  walkInWeight: string;
  setWalkInWeight: React.Dispatch<React.SetStateAction<string>>;
  walkInNotes: string;
  setWalkInNotes: React.Dispatch<React.SetStateAction<string>>;
  needsCapacityOverrideReason: boolean;
  capacityOverrideReason: string;
  setCapacityOverrideReason: React.Dispatch<React.SetStateAction<string>>;
  newBookingServiceId: string;
  setWalkInServiceId: React.Dispatch<React.SetStateAction<string>>;
  servicesData: ServiceItem[] | undefined;
  isSubmittingWalkIn: boolean;
  handleCreateWalkIn: () => void;
}

export type BookingCustomerSectionProps = Pick<
  BookingCreateDialogProps,
  | "selectedCustomer"
  | "setSelectedCustomer"
  | "customerUsers"
  | "foundUsers"
  | "isSearchingPhone"
  | "walkInPhone"
  | "setWalkInPhone"
  | "selectedPetId"
  | "setSelectedPetId"
  | "setWalkInPetName"
  | "setWalkInBreed"
  | "setWalkInWeight"
>;

export type BookingPetSectionProps = Pick<
  BookingCreateDialogProps,
  | "newBookingMode"
  | "selectedCustomer"
  | "customerDetail"
  | "selectedPetId"
  | "setSelectedPetId"
  | "walkInPetName"
  | "setWalkInPetName"
  | "walkInSpecies"
  | "setWalkInSpecies"
  | "walkInBreed"
  | "setWalkInBreed"
  | "walkInWeight"
  | "setWalkInWeight"
  | "walkInNotes"
  | "setWalkInNotes"
  | "needsCapacityOverrideReason"
  | "capacityOverrideReason"
  | "setCapacityOverrideReason"
>;

export type BookingServiceSectionProps = Pick<
  BookingCreateDialogProps,
  "newBookingServiceId" | "setWalkInServiceId" | "servicesData"
>;
