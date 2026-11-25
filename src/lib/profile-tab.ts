export type ProfileTab = "bookings" | "pets" | "orders" | "points";

export function getProfileTabFromSearch(search: string): ProfileTab {
  const requestedTab = new URLSearchParams(search).get("tab");
  return requestedTab === "pets" || requestedTab === "orders" || requestedTab === "points"
    ? requestedTab
    : "bookings";
}
