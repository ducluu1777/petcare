export function getPostOnboardingRedirectTarget(
  redirectUrl: string | null | undefined,
): string | null {
  if (
    !redirectUrl ||
    !redirectUrl.startsWith("/") ||
    redirectUrl.startsWith("//") ||
    redirectUrl === "/tai-khoan"
  ) {
    return null;
  }

  return redirectUrl;
}

export function shouldOpenOnboardingWalkthrough({
  hasWalkthroughParam,
  needsPhone,
  isCompleted,
  hasLoadedPets,
  petCount,
}: {
  hasWalkthroughParam: boolean;
  needsPhone: boolean;
  isCompleted: boolean;
  hasLoadedPets: boolean;
  petCount: number | undefined;
}): boolean {
  if (hasWalkthroughParam || needsPhone) return true;
  return hasLoadedPets && !isCompleted && petCount === 0;
}
