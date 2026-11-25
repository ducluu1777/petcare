"use client";

import * as React from "react";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ServicePriceTiersEditor } from "@/components/admin/services/service-price-tiers-editor";
import { ServiceBasicFields } from "@/components/admin/services/service-basic-fields";
import type { ServiceCategory } from "@/components/admin/services/service-editor-sheet.types";
import type { CreatePriceTierPayload } from "@/hooks/use-services";

interface ServiceEditorSheetState {
  open: boolean;
  editingServiceId: string | null;
  editingServiceHasReferences: boolean;
  editingServiceIsActive: boolean;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: ServiceCategory | "";
  isAddon: boolean;
  tiers: CreatePriceTierPayload[];
  isSubmitting: boolean;
  isUpdatingService: boolean;
}

interface ServiceEditorSheetActions {
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent) => void | Promise<void>;
  onNameChange: (value: string) => void;
  setSlug: (value: string) => void;
  setTagline: (value: string) => void;
  setDescription: (value: string) => void;
  setCategory: (value: ServiceCategory | "") => void;
  onAddonChange: (enabled: boolean) => void;
  onAddTier: (species?: CreatePriceTierPayload["species"]) => void;
  onUpdateTier: (index: number, field: Exclude<keyof CreatePriceTierPayload, "label">, value: string | number) => void;
  onRemoveTier: (index: number) => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
}

interface ServiceEditorSheetProps {
  state: ServiceEditorSheetState;
  actions: ServiceEditorSheetActions;
}

export function ServiceEditorSheet({ state, actions }: ServiceEditorSheetProps) {
  const {
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
    isUpdatingService,
  } = state;
  const {
    onOpenChange: setIsSheetOpen,
    onSubmit: handleSave,
    onNameChange: handleNameChange,
    setSlug,
    setTagline,
    setDescription,
    setCategory,
    onAddonChange,
    onAddTier: handleAddTier,
    onUpdateTier: handleUpdateTier,
    onRemoveTier: handleRemoveTier,
    onToggleActive: handleToggleEditingServiceActive,
    onRequestDelete,
  } = actions;

  return (
    <>
      {/* KHỐI 5: DRAWER TẠO MỚI HOẶC CHỈNH SỬA DỊCH VỤ & BẢNG GIÁ */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[820px] max-w-[95vw] bg-slate-50 border-l border-border-subtle p-0 flex flex-col h-dvh max-h-dvh shadow-2xl z-50"
        >
          <SheetHeader className="p-6 border-b border-border-subtle bg-surface shrink-0">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs bg-slate-100 font-bold">
                {editingServiceId ? `Mã dịch vụ: ${slug}` : "Dịch vụ mới"}
              </Badge>
              <span className="text-xs font-bold text-primary bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {isAddon ? "Dịch vụ bổ sung" : "Dịch vụ chính"}
              </span>
            </div>
            <SheetTitle className="text-lg font-bold text-ink mt-2">
              {editingServiceId ? `Chỉnh sửa dịch vụ: ${name}` : "Tạo dịch vụ mới"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-text">
              Quản lý thông tin và giá theo loài, cân nặng. Dịch vụ bổ sung chỉ cộng vào giá.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
            <ServiceBasicFields
              editing={!!editingServiceId}
              name={name}
              slug={slug}
              tagline={tagline}
              description={description}
              category={category}
              isAddon={isAddon}
              onNameChange={handleNameChange}
              onSlugChange={setSlug}
              onTaglineChange={setTagline}
              onDescriptionChange={setDescription}
              onCategoryChange={setCategory}
              onAddonChange={onAddonChange}
            />

            {/* BẢNG GIÁ THEO BẬC CÂN NẶNG (TIERED PRICING) */}
            <ServicePriceTiersEditor
              tiers={tiers}
              onAddTier={handleAddTier}
              onUpdateTier={handleUpdateTier}
              onRemoveTier={handleRemoveTier}
            />

            {/* FOOTER ACTIONS TRONG DRAWER */}
            <div className="pt-2 flex justify-between items-center border-t border-border-subtle">
              {editingServiceId ? (
                <div className="flex flex-col items-start gap-2">
                  <Button
                    type="button"
                    disabled={isSubmitting || isUpdatingService}
                    onClick={handleToggleEditingServiceActive}
                    variant="outline"
                    className="h-10 gap-1.5 rounded-lg border-border-subtle px-3.5 text-sm font-semibold"
                  >
                    {editingServiceIsActive ? <Archive className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                    <span>{editingServiceIsActive ? "Tạm ngừng dịch vụ" : "Mở lại dịch vụ"}</span>
                  </Button>
                  {editingServiceHasReferences ? (
                    <p className="max-w-64 text-xs leading-relaxed text-muted-text">Dịch vụ đã có lịch đặt nên chỉ tạm ngừng cung cấp để giữ lịch sử.</p>
                  ) : (
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={onRequestDelete}
                      variant="ghost"
                      className="h-10 gap-1.5 rounded-lg px-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Xóa dịch vụ chưa có lịch đặt</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsSheetOpen(false)}
                  variant="outline"
                  className="h-10 rounded-lg border-border-subtle px-4 text-sm font-semibold hover:bg-slate-100"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 gap-1.5 rounded-lg px-5 text-sm font-bold shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{editingServiceId ? "Lưu thay đổi" : "Tạo dịch vụ"}</span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
