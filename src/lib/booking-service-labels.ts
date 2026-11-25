type BookingServiceLabelInput = readonly {
  service?: { name?: string | null } | null;
}[] | null | undefined;

export function getBookingServiceLabels(services: BookingServiceLabelInput): string {
  const labels = (services ?? [])
    .map((item) => item.service?.name?.trim())
    .filter((name): name is string => Boolean(name));

  return labels.length > 0
    ? labels.join(" · ")
    : "Thông tin dịch vụ hiện không khả dụng.";
}
