"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ServiceActiveFilter, ServiceCategoryFilter } from "@/components/admin/services/service-list-filters";
import type { ServiceCategory } from "@/components/admin/services/service-editor-sheet.types";
import {
  useAdminServices,
  useCreateService,
  useDeleteService,
  useUpdateService,
  useUpdateServiceWithPriceTiers,
  type CreatePriceTierPayload,
  type ServiceItem,
} from "@/hooks/use-services";
import { formatServicePriceTierLabel } from "@/lib/service-pricing";
import { isCategorySelected } from "@/lib/admin-category-validation";

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function emptyPriceTier(species?: CreatePriceTierPayload["species"]): CreatePriceTierPayload {
  return { label: "", minWeight: 0, maxWeight: Number.NaN, price: Number.NaN, species };
}

function formatWeight(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function isWeightStepValid(value: number): boolean {
  return Number(value.toFixed(1)) === value;
}

export function useAdminServicesWorkflow() {
  const { data: servicesData, isLoading, isError, isFetching, refetch } = useAdminServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const updateServiceWithPriceTiers = useUpdateServiceWithPriceTiers();
  const deleteService = useDeleteService();

  const services: ServiceItem[] = React.useMemo(
    () => Array.isArray(servicesData) ? servicesData : [],
    [servicesData],
  );
  const operationalServices = React.useMemo(
    () => services,
    [services],
  );
  const activeOperationalServices = React.useMemo(
    () => operationalServices.filter((service) => service.isActive),
    [operationalServices],
  );

  const [categoryFilter, setCategoryFilter] = React.useState<ServiceCategoryFilter>("ALL");
  const [activeFilter, setActiveFilter] = React.useState<ServiceActiveFilter>("ACTIVE");
  const [searchQuery, setSearchQuery] = React.useState("");
  const hasServiceFilters = !!searchQuery.trim() || categoryFilter !== "ALL" || activeFilter !== "ALL";
  const spaCount = activeOperationalServices.filter((service) => !service.isAddon).length;
  const addonCount = activeOperationalServices.filter((service) => service.isAddon).length;
  const vaccinationCount = activeOperationalServices.filter((service) => service.requiresVaccination).length;

  const filteredServices = React.useMemo(() => {
    return operationalServices.filter((service) => {
      if (activeFilter === "ACTIVE" && !service.isActive) return false;
      if (activeFilter === "INACTIVE" && service.isActive) return false;
      if (categoryFilter === "SPA" && service.isAddon) return false;
      if (categoryFilter === "ADDON" && !service.isAddon) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        return service.name.toLowerCase().includes(query) || service.slug.toLowerCase().includes(query);
      }
      return true;
    });
  }, [operationalServices, activeFilter, categoryFilter, searchQuery]);

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = React.useState(false);
  const [editingServiceId, setEditingServiceId] = React.useState<string | null>(null);
  const [editingServiceHasReferences, setEditingServiceHasReferences] = React.useState(false);
  const [editingServiceIsActive, setEditingServiceIsActive] = React.useState(true);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<ServiceCategory | "">("");
  const [isAddon, setIsAddon] = React.useState(false);
  const [tiers, setTiers] = React.useState<CreatePriceTierPayload[]>([emptyPriceTier()]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleOpenCreate = () => {
    setEditingServiceId(null);
    setEditingServiceHasReferences(false);
    setEditingServiceIsActive(true);
    setName("");
    setSlug("");
    setTagline("");
    setDescription("");
    setCategory("");
    setIsAddon(false);
    setTiers([emptyPriceTier()]);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setEditingServiceHasReferences((service._count?.bookingServices ?? 0) > 0);
    setEditingServiceIsActive(service.isActive);
    setName(service.name);
    setSlug(service.slug);
    setTagline(service.tagline || "");
    setDescription(service.description || "");
    setCategory(service.category);
    setIsAddon(service.isAddon);

    if (service.priceTiers && service.priceTiers.length > 0) {
      setTiers(service.priceTiers.map((tier) => ({
        label: tier.label,
        minWeight: tier.minWeight,
        maxWeight: tier.maxWeight,
        price: tier.price,
        species: tier.species || undefined,
      })));
    } else {
      setTiers([emptyPriceTier()]);
    }
    setIsSheetOpen(true);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingServiceId) setSlug(generateSlug(value));
  };

  const handleAddTier = (species?: CreatePriceTierPayload["species"]) => {
    const groupTiers = tiers
      .map((tier, index) => ({ tier, index }))
      .filter(({ tier }) => (tier.species ?? undefined) === species)
      .sort((first, second) => first.tier.minWeight - second.tier.minWeight);
    const lastEntry = groupTiers[groupTiers.length - 1];
    if (!lastEntry) {
      setTiers([...tiers, emptyPriceTier(species)]);
      return;
    }

    const { tier: lastTier, index: lastIndex } = lastEntry;
    if (!Number.isFinite(lastTier.minWeight) || !Number.isFinite(lastTier.maxWeight) || lastTier.minWeight < 0 || lastTier.maxWeight <= lastTier.minWeight) {
      toast.error("Nhập khoảng cân nặng hợp lệ cho bậc hiện tại trước khi thêm bậc mới.");
      return;
    }

    const lastTierWidth = Number((lastTier.maxWeight - lastTier.minWeight).toFixed(1));
    if (lastTierWidth < 5) {
      toast.error("Mỗi bậc giá cần rộng tối thiểu 5 kg.");
      return;
    }

    const splitWeight = Number((lastTier.minWeight + 5).toFixed(1));
    if (lastTierWidth >= 10) {
      const updatedTiers = [...tiers];
      updatedTiers[lastIndex] = {
        ...lastTier,
        label: `${formatWeight(lastTier.minWeight)} - ${formatWeight(splitWeight)} kg`,
        maxWeight: splitWeight,
      };
      updatedTiers.push({
        label: `${formatWeight(splitWeight)} - ${formatWeight(lastTier.maxWeight)} kg`,
        minWeight: splitWeight,
        maxWeight: lastTier.maxWeight,
        price: Number.NaN,
        species,
      });
      setTiers(updatedTiers);
      return;
    }

    const nextMin = lastTier.maxWeight;
    const nextMax = Number((nextMin + 5).toFixed(1));
    if (nextMax > 20) {
      toast.error("Bảng giá chỉ nhận thú cưng đến tối đa 20 kg.");
      return;
    }
    setTiers([...tiers, {
      label: `${formatWeight(nextMin)} - ${formatWeight(nextMax)} kg`,
      minWeight: nextMin,
      maxWeight: nextMax,
      price: Number.NaN,
      species,
    }]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      toast.error("Gói dịch vụ cần có ít nhất một bậc giá.");
      return;
    }
    setTiers(tiers.filter((_, tierIndex) => tierIndex !== index));
  };

  const handleUpdateTier = (index: number, field: Exclude<keyof CreatePriceTierPayload, "label">, value: string | number) => {
    const updatedTiers = [...tiers];
    if (field === "species") {
      updatedTiers[index] = { ...updatedTiers[index], species: value === "" ? undefined : value as "DOG" | "CAT" };
    } else {
      updatedTiers[index] = { ...updatedTiers[index], [field]: Number(value) };
    }
    setTiers(updatedTiers);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCategorySelected(category)) {
      toast.error("Chọn danh mục dịch vụ trước khi lưu.");
      return;
    }
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên gói dịch vụ.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Vui lòng nhập mã định danh dịch vụ.");
      return;
    }
    if (tiers.length === 0) {
      toast.error("Vui lòng cấu hình ít nhất một bậc giá.");
      return;
    }
    if (tiers.some((tier) =>
      !Number.isFinite(tier.minWeight) || !Number.isFinite(tier.maxWeight) ||
      !Number.isInteger(tier.price) || tier.minWeight < 0 || tier.maxWeight > 20 || tier.maxWeight <= tier.minWeight ||
      !isWeightStepValid(tier.minWeight) || !isWeightStepValid(tier.maxWeight) || tier.price < 0
    )) {
      toast.error("Kiểm tra khoảng cân theo bước 0,1 kg và giá. Có thể đặt giá 0 đồng.");
      return;
    }
    if (tiers.some((tier) => Number((tier.maxWeight - tier.minWeight).toFixed(1)) < 5)) {
      toast.error("Mỗi bậc giá cần rộng tối thiểu 5 kg.");
      return;
    }

    const tiersBySpecies = new Map<string, CreatePriceTierPayload[]>();
    for (const tier of tiers) {
      const group = tier.species ?? "ALL";
      tiersBySpecies.set(group, [...(tiersBySpecies.get(group) ?? []), tier]);
    }
    for (const [species, groupTiers] of tiersBySpecies) {
      const sortedGroupTiers = [...groupTiers].sort((first, second) => first.minWeight - second.minWeight);
      const isContinuous = sortedGroupTiers[0].minWeight === 0 &&
        sortedGroupTiers.every((tier, index) => index === 0 || tier.minWeight === sortedGroupTiers[index - 1].maxWeight) &&
        sortedGroupTiers[sortedGroupTiers.length - 1].maxWeight === 20;
      if (!isContinuous) {
        const groupLabel = species === "ALL" ? "Dùng chung" : species === "DOG" ? "Chó" : "Mèo";
        toast.error(`Bảng giá ${groupLabel} phải bắt đầu từ 0 kg, liền nhau và kết thúc ở 20 kg.`);
        return;
      }
    }
    setIsSubmitting(true);
    const priceTiers = tiers.map((tier) => {
      const sameSpeciesTiers = tiers.filter((candidate) => (candidate.species ?? null) === (tier.species ?? null));
      return {
        label: formatServicePriceTierLabel(tier, sameSpeciesTiers, false),
        minWeight: Number(tier.minWeight),
        maxWeight: Number(tier.maxWeight),
        price: Number(tier.price),
        species: tier.species,
      };
    });
    try {
      if (editingServiceId) {
        await updateServiceWithPriceTiers.mutateAsync({
          id: editingServiceId,
          data: { name, tagline, description, category, isAddon },
          priceTiers,
        });
        toast.success("Đã cập nhật dịch vụ và bảng giá.");
      } else {
        await createService.mutateAsync({
          name,
          slug,
          tagline,
          description,
          category,
          isAddon,
          priceTiers,
        });
        toast.success("Đã tạo gói dịch vụ.");
      }
      setIsSheetOpen(false);
      refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message ? `Không thể lưu dịch vụ: ${message}` : "Không thể lưu dịch vụ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingServiceId || editingServiceHasReferences) return;
    setIsSubmitting(true);
    try {
      await deleteService.mutateAsync(editingServiceId);
      toast.success("Đã xóa dịch vụ chưa có lịch hẹn tham chiếu.");
      setIsDeleteConfirmationOpen(false);
      setIsSheetOpen(false);
      refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message ? `Không thể xóa dịch vụ: ${message}` : "Không thể xóa dịch vụ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (service: ServiceItem) => {
    try {
      await updateService.mutateAsync({ id: service.id, data: { isActive: !service.isActive } });
      toast.success(service.isActive ? "Đã tạm ngừng dịch vụ." : "Đã mở lại dịch vụ.");
      await refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái dịch vụ.";
      toast.error(message);
    }
  };

  const handleToggleEditingServiceActive = async () => {
    if (!editingServiceId) return;
    try {
      await updateService.mutateAsync({ id: editingServiceId, data: { isActive: !editingServiceIsActive } });
      setEditingServiceIsActive((current) => !current);
      toast.success(editingServiceIsActive ? "Đã tạm ngừng dịch vụ." : "Đã mở lại dịch vụ.");
      await refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái dịch vụ.";
      toast.error(message);
    }
  };

  const serviceEditorState = {
    open: isSheetOpen,
    editingServiceId,
    editingServiceHasReferences,
    editingServiceIsActive,
    name,
    slug,
    tagline,
    description,
    category,
    isAddon,
    tiers,
    isSubmitting,
    isUpdatingService: updateService.isPending || updateServiceWithPriceTiers.isPending,
  };
  const serviceEditorActions = {
    onOpenChange: setIsSheetOpen,
    onSubmit: handleSave,
    onNameChange: handleNameChange,
    setSlug,
    setTagline,
    setDescription,
    setCategory,
    onAddonChange: (enabled: boolean) => {
      setIsAddon(enabled);
      if (!editingServiceId) {
        setTiers([emptyPriceTier()]);
      }
    },
    onAddTier: handleAddTier,
    onUpdateTier: handleUpdateTier,
    onRemoveTier: handleRemoveTier,
    onToggleActive: handleToggleEditingServiceActive,
    onRequestDelete: () => setIsDeleteConfirmationOpen(true),
  };

  return {
    isLoading,
    isError,
    isFetching,
    refetch,
    services,
    operationalServices,
    activeOperationalServices,
    spaCount,
    addonCount,
    vaccinationCount,
    filteredServices,
    categoryFilter,
    setCategoryFilter,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    hasServiceFilters,
    isDeleteConfirmationOpen,
    setIsDeleteConfirmationOpen,
    isSubmitting,
    editingServiceHasReferences,
    isUpdatingService: updateService.isPending || updateServiceWithPriceTiers.isPending,
    serviceEditorState,
    serviceEditorActions,
    handleOpenCreate,
    handleOpenEdit,
    handleDelete,
    handleToggleActive,
    clearFilters: () => {
      setSearchQuery("");
      setCategoryFilter("ALL");
      setActiveFilter("ALL");
    },
  };
}
