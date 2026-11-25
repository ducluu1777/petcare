import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BookingServiceSectionProps } from "@/components/admin/bookings/booking-create-dialog.types";

export function BookingServiceSection({
  newBookingServiceId,
  setWalkInServiceId,
  servicesData,
}: BookingServiceSectionProps) {
  const selectedService = servicesData?.find(
    (service) => service.id === newBookingServiceId && !service.isAddon,
  );
  const selectedLowestPrice = selectedService?.priceTiers?.length
    ? Math.min(...selectedService.priceTiers.map((tier) => tier.price))
    : 0;
  const selectedServiceLabel = selectedService
    ? `${selectedService.name} (${selectedLowestPrice.toLocaleString("vi-VN")}₫)`
    : undefined;

  return (
    <section aria-labelledby="booking-service-section-title" className="space-y-2.5 rounded-xl border border-border-subtle bg-slate-50 p-3.5">
      <h3 id="booking-service-section-title" className="text-sm font-semibold text-slate-700">
        Dịch vụ
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="booking-service-select" className="mb-1 block text-sm font-semibold text-slate-700">
            Dịch vụ chính <span aria-hidden="true">*</span>
          </Label>
          <Select items={(servicesData ?? []).filter((service) => !service.isAddon).map((service) => ({ value: service.id, label: service.name }))} value={newBookingServiceId || null} onValueChange={(value) => setWalkInServiceId(value || "")}>
            <SelectTrigger id="booking-service-select" className="w-full bg-surface text-sm">
              <SelectValue placeholder="Chọn gói dịch vụ">{selectedServiceLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {servicesData
                ?.filter((service) => !service.isAddon)
                .map((service) => {
                  const lowestPrice = service.priceTiers && service.priceTiers.length > 0
                    ? Math.min(...service.priceTiers.map((tier) => tier.price))
                    : 0;
                  return (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({lowestPrice.toLocaleString("vi-VN")}₫)
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
