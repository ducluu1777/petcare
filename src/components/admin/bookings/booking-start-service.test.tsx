import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { useBookingStatusWorkflow } from "@/hooks/use-booking-status-workflow";
import type { BookingRecord } from "@/lib/admin-booking-record";
import { BookingProgressCard } from "./booking-progress-card";

type WorkflowOptions = Parameters<typeof useBookingStatusWorkflow>[0];

const arrivedBooking: BookingRecord = {
  id: "booking-unchanged-weight",
  code: "BK-UNCHANGED-WEIGHT",
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

function ProgressPreview({ booking }: { booking: BookingRecord }) {
  const workflow = useBookingStatusWorkflow({
    bookings: [booking],
    selectedBooking: booking,
    setSelectedBooking: () => {},
    setBookings: () => {},
    refetch: async () => { throw new Error("Rendering must not send a request"); },
    showToast: () => {},
    updateStatusMutation: { isPending: false } as WorkflowOptions["updateStatusMutation"],
    updateStatusV2Mutation: { isPending: false } as WorkflowOptions["updateStatusV2Mutation"],
  });

  return <BookingProgressCard
    booking={booking}
    nextAction={workflow.nextBookingAction}
    isUpdating={workflow.isUpdatingStatus}
    canMarkNoShow={workflow.canMarkNoShow}
    noShowEligibleAt={workflow.noShowEligibleAt}
    onAdvance={() => {}}
    onOpenNoShow={() => {}}
  />;
}

describe("Starting Spa with an unchanged weight", () => {
  it("offers a direct start action after reception", () => {
    const markup = renderToStaticMarkup(<ProgressPreview booking={arrivedBooking} />);
    expect(markup).toContain("Bắt đầu chăm sóc");
  });

  it("does not offer to start a completed appointment again", () => {
    const markup = renderToStaticMarkup(<ProgressPreview booking={{ ...arrivedBooking, status: "COMPLETED", statusV2: "DONE" }} />);
    expect(markup).not.toContain("Bắt đầu chăm sóc");
    expect(markup).toContain("Hoàn tất và đã bàn giao");
  });
});
