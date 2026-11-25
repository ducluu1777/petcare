"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { PetEditDialog } from "@/components/admin/pets/pet-edit-dialog"
import { PetDetailSheet } from "@/components/admin/pets/pet-detail-sheet"
import { PetDirectoryFilters } from "@/components/admin/pets/pet-directory-filters"
import { PetCreateDialog } from "@/components/admin/pets/pet-create-dialog"
import { PetDirectoryMetrics } from "@/components/admin/pets/pet-directory-metrics"
import { PetDirectoryTable } from "@/components/admin/pets/pet-directory-table"
import { Plus } from "lucide-react"
import { useAdminPetsWorkflow } from "@/hooks/use-admin-pets-workflow"

export default function PetsManagementPage() {
  const {
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
    isSaving,
    isArchivingPet,
    isRestoringPet,
    isSheetOpen,
    isUpdatingBehavior,
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
  } = useAdminPetsWorkflow()

  return (
    <AdminPageShell>
      <AdminPageHeader
        section="Khách hàng"
        subsection="Thú cưng"
        title="Hồ sơ thú cưng"
        description="Xem thông tin, sức khỏe, hành vi và lịch sử dịch vụ của thú cưng."
        onRefresh={refetch}
        isRefreshing={isFetching}
        actions={
          <>
            <Badge variant="outline" className="border-border-subtle bg-admin-muted-surface text-xs text-muted-text">
              {petDataUnavailable ? "Số liệu chưa khả dụng" : `${pets.length} hồ sơ`}
            </Badge>
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)} className="h-10 rounded-lg px-3.5 text-sm">
              <Plus aria-hidden="true" className="size-4" />
              Tạo hồ sơ
            </Button>
          </>
        }
      />

      <PetDirectoryMetrics
        isUnavailable={petDataUnavailable}
        petCount={pets.length}
        dogCount={dogCount}
        catCount={catCount}
        warningCount={warningCount}
        vaccinatedCount={vaccinatedCount}
        averageBookings={averageBookings}
      />

      <PetDirectoryFilters
        speciesFilter={speciesFilter}
        searchQuery={searchQuery}
        allCount={petDataUnavailable ? null : pets.length}
        dogCount={petDataUnavailable ? null : dogCount}
        catCount={petDataUnavailable ? null : catCount}
        onSpeciesChange={setSpeciesFilter}
        onSearchChange={setSearchQuery}
      />

      <PetDirectoryTable
        isLoading={isLoading}
        isError={isError}
        hasFilters={hasPetFilters}
        filteredPets={filteredPets}
        onRetry={refetch}
        onClearFilters={() => { setSearchQuery(""); setSpeciesFilter("ALL"); }}
        onOpenDetail={handleOpenDetail}
      />

      <PetDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        pet={selectedPet}
        operationError={operationError}
        isUpdatingBehavior={isUpdatingBehavior}
        onUpdateBehavior={handleUpdateFlag}
        onEdit={startEditingPet}
        onArchive={handleArchivePet}
        onRestore={handleRestorePet}
        isArchiving={isArchivingPet}
        isRestoring={isRestoringPet}
      />

      <PetEditDialog
        open={isEditingPet && selectedPet !== null}
        pet={selectedPet}
        petDraft={petDraft}
        setPetDraft={setPetDraft}
        operationError={operationError}
        isSaving={isSaving}
        onOpenChange={handleEditDialogOpenChange}
        handleSavePet={handleSavePet}
        onCancel={cancelEditingPet}
      />

      <PetCreateDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </AdminPageShell>
  )
}
