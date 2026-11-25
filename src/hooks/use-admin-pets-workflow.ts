"use client";

import * as React from "react";
import { useAllPets, useArchivePet, useRestorePet, useUpdateBehavioralFlag, useUpdatePet, type PetItem } from "@/hooks/use-pets";
import type { PetDraft, PetProfile } from "@/lib/admin-pet-profile";
import type { PetSpeciesFilter } from "@/components/admin/pets/pet-directory-filters";

const EMPTY_PET_DRAFT: PetDraft = {
  name: "",
  breed: "",
  weightKg: "",
  ageMonths: "",
  notes: "",
  hasVaccine: false,
};

function getBehaviorWarnings(flag?: PetProfile["behavioralFlag"]): string[] {
  if (flag === "AGGRESSIVE") return ["Có thể phản ứng mạnh khi thao tác"];
  if (flag === "TIMID") return ["Cần thời gian làm quen với thao tác"];
  return [];
}

function formatPetAge(ageMonths?: number | null): string {
  if (ageMonths == null) return "Chưa cập nhật";
  if (ageMonths < 12) return `${ageMonths} tháng`;

  const years = Math.floor(ageMonths / 12);
  const remainingMonths = ageMonths % 12;
  return remainingMonths > 0 ? `${years} tuổi ${remainingMonths} tháng` : `${years} tuổi`;
}

function formatBookingDateTime(booking: NonNullable<PetItem["bookings"]>[number]): string {
  if (booking.startAt) {
    return new Date(booking.startAt).toLocaleString("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  if (booking.timeSlot) {
    const date = new Date(booking.timeSlot.slotDate).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    return `${date} · ${booking.timeSlot.slotTime}`;
  }

  return "Chưa có ngày giờ hẹn";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useAdminPetsWorkflow() {
  const { data: remotePets, isLoading, isFetching, isError, refetch } = useAllPets();
  const updateBehaviorMutation = useUpdateBehavioralFlag();
  const updatePetMutation = useUpdatePet();
  const archivePetMutation = useArchivePet();
  const restorePetMutation = useRestorePet();
  const [selectedPet, setSelectedPet] = React.useState<PetProfile | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [speciesFilter, setSpeciesFilter] = React.useState<PetSpeciesFilter>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isEditingPet, setIsEditingPet] = React.useState(false);
  const [petDraft, setPetDraft] = React.useState<PetDraft>(EMPTY_PET_DRAFT);
  const [operationError, setOperationError] = React.useState<string | null>(null);
  const hasPetFilters = !!searchQuery.trim() || speciesFilter !== "ALL";

  const pets: PetProfile[] = React.useMemo(() => {
    if (!remotePets || !Array.isArray(remotePets)) return [];
    return remotePets.map((pet: PetItem) => {
      const species = pet.species === "DOG" ? "Chó" : "Mèo";
      const ownerContact = pet.user?.phone || pet.user?.email || "";

      return {
        id: pet.id,
        code: `PET-${pet.id.slice(-4).toUpperCase()}`,
        name: pet.name,
        species,
        breed: pet.breed || "Chưa cập nhật giống",
        weight: pet.weightKg ?? null,
        age: formatPetAge(pet.ageMonths),
        ownerName: pet.user?.name || "Chủ nuôi chưa cập nhật tên",
        ownerContact,
        ownerContactType: pet.user?.phone ? "SĐT" : pet.user?.email ? "Email" : "Chưa có thông tin liên hệ",
        vaccinationStatus: pet.hasVaccine ? "Có ghi nhận tiêm phòng" : "Chưa ghi nhận tiêm phòng",
        behaviorWarnings: getBehaviorWarnings(pet.behavioralFlag),
        behavioralFlag: pet.behavioralFlag || "NORMAL",
        totalBookings: pet._count?.bookings ?? pet.bookings?.length ?? 0,
        recentBookings: (pet.bookings || []).map((booking) => ({
          id: booking.id,
          code: booking.code,
          scheduledAt: formatBookingDateTime(booking),
          status: booking.statusV2 || booking.status,
          services: booking.services.map((service) => service.service?.name).filter((name): name is string => Boolean(name)),
        })),
        ageMonths: pet.ageMonths,
        notes: pet.notes,
        hasVaccine: pet.hasVaccine,
        isArchived: pet.archivedAt != null,
      };
    });
  }, [remotePets]);

  const dogCount = React.useMemo(() => pets.filter((pet) => pet.species === "Chó").length, [pets]);
  const catCount = React.useMemo(() => pets.filter((pet) => pet.species === "Mèo").length, [pets]);
  const warningCount = React.useMemo(
    () => pets.filter((pet) => pet.behavioralFlag === "AGGRESSIVE" || pet.behavioralFlag === "TIMID").length,
    [pets],
  );
  const vaccinatedCount = React.useMemo(() => pets.filter((pet) => pet.hasVaccine).length, [pets]);
  const averageBookings = React.useMemo(() => {
    if (pets.length === 0) return 0;
    const total = pets.reduce((sum, pet) => sum + pet.totalBookings, 0);
    return (total / pets.length).toFixed(1);
  }, [pets]);
  const petDataUnavailable = isLoading || isError;

  const filteredPets = React.useMemo(() => pets.filter((pet) => {
    if (speciesFilter === "DOG" && pet.species !== "Chó") return false;
    if (speciesFilter === "CAT" && pet.species !== "Mèo") return false;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return pet.name.toLowerCase().includes(query)
        || pet.code.toLowerCase().includes(query)
        || pet.ownerName.toLowerCase().includes(query)
        || pet.ownerContact.toLowerCase().includes(query)
        || pet.breed.toLowerCase().includes(query);
    }
    return true;
  }), [pets, speciesFilter, searchQuery]);

  const handleOpenDetail = (pet: PetProfile) => {
    setSelectedPet(pet);
    setIsSheetOpen(true);
    setIsEditingPet(false);
    setOperationError(null);
  };

  const handleUpdateFlag = async (newFlag: "NORMAL" | "TIMID" | "AGGRESSIVE") => {
    if (!selectedPet) return;
    try {
      await updateBehaviorMutation.mutateAsync({ id: selectedPet.id, flag: newFlag });
      setSelectedPet((previous) => previous ? {
        ...previous,
        behavioralFlag: newFlag,
        behaviorWarnings: getBehaviorWarnings(newFlag),
      } : null);
    } catch (error) {
      setOperationError(getErrorMessage(error, "Không thể cập nhật cờ hành vi."));
    }
  };

  const startEditingPet = () => {
    if (!selectedPet) return;
    setPetDraft({
      name: selectedPet.name,
      breed: selectedPet.breed === "Chưa cập nhật giống" ? "" : selectedPet.breed,
      weightKg: selectedPet.weight == null ? "" : String(selectedPet.weight),
      ageMonths: selectedPet.ageMonths == null ? "" : String(selectedPet.ageMonths),
      notes: selectedPet.notes || "",
      hasVaccine: selectedPet.hasVaccine,
    });
    setOperationError(null);
    setIsEditingPet(true);
  };

  const handleSavePet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPet) return;
    try {
      const ageMonths = petDraft.ageMonths.trim() ? Number(petDraft.ageMonths) : null;
      await updatePetMutation.mutateAsync({
        id: selectedPet.id,
        data: {
          name: petDraft.name.trim(),
          breed: petDraft.breed.trim(),
          weightKg: Number(petDraft.weightKg),
          ageMonths,
          notes: petDraft.notes.trim(),
          hasVaccine: petDraft.hasVaccine,
        },
      });
      setSelectedPet((current) => current ? {
        ...current,
        name: petDraft.name.trim(),
        breed: petDraft.breed.trim(),
        weight: Number(petDraft.weightKg),
        ageMonths,
        age: formatPetAge(ageMonths),
        notes: petDraft.notes.trim(),
        hasVaccine: petDraft.hasVaccine,
        vaccinationStatus: petDraft.hasVaccine ? "Có ghi nhận tiêm phòng" : "Chưa ghi nhận tiêm phòng",
      } : null);
      setIsEditingPet(false);
      setOperationError(null);
    } catch (error) {
      setOperationError(getErrorMessage(error, "Không thể lưu hồ sơ thú cưng."));
    }
  };

  const cancelEditingPet = () => {
    setIsEditingPet(false);
    setOperationError(null);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    if (!open) cancelEditingPet();
  };

  const handleArchivePet = async () => {
    if (!selectedPet) return false;
    setOperationError(null);
    try {
      await archivePetMutation.mutateAsync(selectedPet.id);
      setSelectedPet((current) => current ? { ...current, isArchived: true } : null);
      return true;
    } catch (error) {
      setOperationError(getErrorMessage(error, "Không thể lưu trữ hồ sơ thú cưng."));
      return false;
    }
  };

  const handleRestorePet = async () => {
    if (!selectedPet) return;
    setOperationError(null);
    try {
      await restorePetMutation.mutateAsync(selectedPet.id);
      setSelectedPet((current) => current ? { ...current, isArchived: false } : null);
    } catch (error) {
      setOperationError(getErrorMessage(error, "Không thể khôi phục hồ sơ thú cưng."));
    }
  };

  return {
    averageBookings,
    cancelEditingPet,
    catCount,
    dogCount,
    filteredPets,
    handleEditDialogOpenChange,
    handleArchivePet,
    handleOpenDetail,
    handleRestorePet,
    handleSavePet,
    handleUpdateFlag,
    hasPetFilters,
    isCreateDialogOpen,
    isEditingPet,
    isError,
    isFetching,
    isLoading,
    isSaving: updatePetMutation.isPending,
    isArchivingPet: archivePetMutation.isPending,
    isRestoringPet: restorePetMutation.isPending,
    isSheetOpen,
    isUpdatingBehavior: updateBehaviorMutation.isPending,
    operationError,
    petDataUnavailable,
    petDraft,
    pets,
    refetch,
    searchQuery,
    selectedPet,
    setIsCreateDialogOpen,
    setIsSheetOpen,
    setPetDraft,
    setSearchQuery,
    setSpeciesFilter,
    speciesFilter,
    startEditingPet,
    vaccinatedCount,
    warningCount,
  };
}
