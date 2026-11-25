export type ManagedUserRole = "CUSTOMER" | "STAFF" | "ADMIN";
export type AdminActorRole = ManagedUserRole | null | undefined;

export function canChangeManagedUserRole(
  actorRole: AdminActorRole,
  _targetRole: ManagedUserRole,
  _nextRole: ManagedUserRole,
): boolean {
  return actorRole === "ADMIN";
}
