import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BookingRecord } from "@/lib/admin-booking-record";

interface BookingStaffOption {
  id: string;
  name: string;
  phone: string | null;
}

interface BookingStaffAssignmentCardProps {
  booking: BookingRecord;
  staffMembers: BookingStaffOption[];
  isOpen: boolean;
  selectedStaffId: string;
  isSaving: boolean;
  onToggle: () => void;
  onStaffChange: (staffId: string) => void;
  onCancel: () => void;
  onAssign: () => void;
}

export function BookingStaffAssignmentCard({
  booking,
  staffMembers,
  isOpen,
  selectedStaffId,
  isSaving,
  onToggle,
  onStaffChange,
  onCancel,
  onAssign,
}: BookingStaffAssignmentCardProps) {
  const isClosed = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status);

  return (
    <section aria-labelledby="booking-staff-title" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 id="booking-staff-title" className="text-sm font-semibold text-ink">Nhân viên phụ trách</h3>
        {!isClosed && (
          <Button type="button" onClick={onToggle} variant="link" className="h-auto shrink-0 whitespace-nowrap p-0 text-sm font-semibold text-primary">
            {isOpen ? "Đóng chọn" : "Đổi nhân viên phụ trách"}
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border-subtle bg-slate-50 p-3 text-xs">
        <span className="block text-xs text-muted-text">Đang phụ trách</span>
        <strong className="mt-0.5 block text-sm text-primary">{booking.service.assignedStaff}</strong>
        {booking.service.assignedStaff === "Chưa phân công" && (
          <span className="mt-1 block text-muted-text">Chưa có nhân viên được giao lịch này.</span>
        )}
      </div>

      {isOpen && !isClosed && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-slate-50 p-3.5 text-sm">
          <div>
            <label htmlFor="booking-staff-select" className="mb-1 block font-semibold text-slate-700">Chọn nhân viên</label>
            <Select items={staffMembers.map((staff) => ({ value: staff.id, label: staff.name }))} value={selectedStaffId || null} onValueChange={(value) => onStaffChange(value || "")}>
              <SelectTrigger id="booking-staff-select" className="w-full text-sm">
                <SelectValue placeholder="Chọn nhân viên">
                  {selectedStaffId ? staffMembers.find((staff) => staff.id === selectedStaffId)?.name : ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.phone ? `${staff.name} · ${staff.phone}` : staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 border-t border-teal-200/60 pt-1">
            <Button type="button" onClick={onCancel} variant="outline" className="h-10 rounded-md border-border-subtle bg-surface px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Hủy
            </Button>
            <Button type="button" disabled={!selectedStaffId || isSaving} onClick={onAssign} className="h-10 rounded-md px-3 text-sm font-semibold">
              {isSaving ? "Đang lưu..." : "Xác nhận phân công"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
