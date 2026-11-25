"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceCategory } from "@/components/admin/services/service-editor-sheet.types";

interface ServiceBasicFieldsProps {
  editing: boolean;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: ServiceCategory | "";
  isAddon: boolean;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onTaglineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: ServiceCategory) => void;
  onAddonChange: (enabled: boolean) => void;
}

export function ServiceBasicFields({
  editing,
  name,
  slug,
  tagline,
  description,
  category,
  isAddon,
  onNameChange,
  onSlugChange,
  onTaglineChange,
  onDescriptionChange,
  onCategoryChange,
  onAddonChange,
}: ServiceBasicFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <span className="block font-semibold text-slate-700">Thông tin dịch vụ</span>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="service-name" className="mb-1 block font-medium text-slate-600">Tên dịch vụ *</Label>
          <Input
            id="service-name"
            required
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="VD: Tắm và cắt tỉa cơ bản"
            className="h-10 bg-slate-50 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="service-slug" className="mb-1 block font-medium text-slate-600">Mã dịch vụ *</Label>
          <Input
            id="service-slug"
            required
            disabled={editing}
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            placeholder="tam-va-cat-tia-co-ban"
            className="h-10 bg-slate-50 text-sm tabular-nums disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="service-tagline" className="mb-1 block font-medium text-slate-600">Mô tả ngắn</Label>
        <Input
          id="service-tagline"
          value={tagline}
          onChange={(event) => onTaglineChange(event.target.value)}
          placeholder="VD: Chăm sóc cơ bản cho chó dưới 5 kg"
          className="h-10 bg-slate-50 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="service-description" className="mb-1 block font-medium text-slate-600">Mô tả chi tiết quy trình</Label>
        <Textarea
          id="service-description"
          rows={3}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="VD: Tắm, sấy, vệ sinh tai và cắt tỉa lông theo yêu cầu."
          className="bg-slate-50 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-2">
        <div>
          <Label htmlFor="service-category" className="mb-1 block font-medium text-slate-600">Danh mục chính *</Label>
          <Select items={{ BATH: "Tắm và sấy", GROOMING: "Cắt tỉa lông", CAT_SPA: "Chăm sóc chuyên biệt cho mèo" }} value={category || null} onValueChange={(value) => onCategoryChange(value as ServiceCategory)}>
            <SelectTrigger id="service-category" aria-required="true" className="w-full bg-slate-50 text-sm">
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BATH">Tắm và sấy</SelectItem>
              <SelectItem value="GROOMING">Cắt tỉa lông</SelectItem>
              <SelectItem value="CAT_SPA">Chăm sóc chuyên biệt cho mèo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="isAddonCheck"
            checked={isAddon}
            onCheckedChange={(checked) => onAddonChange(checked === true)}
          />
          <Label htmlFor="isAddonCheck" className="cursor-pointer font-medium text-slate-700">
            Dịch vụ bổ sung
          </Label>
        </div>
      </div>
    </div>
  );
}
