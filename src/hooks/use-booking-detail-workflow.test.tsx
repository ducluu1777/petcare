import { describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { BookingRecord } from "@/lib/admin-booking-record";
import { useBookingDetailWorkflow } from "./use-booking-detail-workflow";

const booking: BookingRecord = {
  id: "booking-saved-weight",
  code: "BK-SAVED-WEIGHT",
  date: "2026-11-01",
  type: "SPA",
  source: "WEB",
  status: "ARRIVED",
  statusV2: "ARRIVED",
  startAt: "2026-11-01T03:00:00.000Z",
  spaBookingPromotionEligible: false,
  latePickupFeeAmount: 0,
  latePickupFeePaid: false,
  customer: { name: "Khách test", phone: "", loyaltyPointsLabel: "0 điểm" },
  pet: { id: "pet-1", name: "Bông", breed: "Poodle", species: "Chó", weight: 5.1, age: "2 tuổi", allergies: "" },
  service: { title: "Tắm Spa", category: "Spa", assignedStaff: "Chưa phân công", scheduledTime: "10:00", items: [] },
  financial: { subtotal: 350000, discount: 0, finalAmount: 350000, serviceRemainingAmount: 350000, remainingAmount: 350000, paymentStatus: "UNPAID" },
  parentNotes: "",
};

describe("Starting an already open booking without entering another weight", () => {
  it("uses the saved booking when the optional weight field is empty", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false, gcTime: Infinity } } });
    const start = mock(async () => true);
    const showToast = mock(() => {});
    const refetch = mock(async () => { throw new Error("Unchanged weight must not request a new quote"); });
    let workflow: ReturnType<typeof useBookingDetailWorkflow> | undefined;

    function Harness() {
      workflow = useBookingDetailWorkflow({
        selectedBooking: booking,
        setSelectedBooking: () => {},
        setSheetOpen: () => {},
        setBookings: () => {},
        refetch,
        resetCashierForBooking: () => {},
        showToast,
        onWeightSavedAndStart: start,
      });
      return null;
    }

    try {
      renderToStaticMarkup(<QueryClientProvider client={queryClient}><Harness /></QueryClientProvider>);
      expect(workflow).toBeDefined();
      expect(workflow!.state.editWeightVal).toBe("");

      await workflow!.actions.onStartService();

      expect(start).toHaveBeenCalledWith(booking);
      expect(showToast).not.toHaveBeenCalled();
      expect(refetch).not.toHaveBeenCalled();
    } finally {
      queryClient.clear();
    }
  });
});
