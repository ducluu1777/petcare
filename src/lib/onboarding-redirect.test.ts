import { describe, expect, it } from "bun:test";
import {
  getPostOnboardingRedirectTarget,
  shouldOpenOnboardingWalkthrough,
} from "./onboarding-redirect";

describe("getPostOnboardingRedirectTarget", () => {
  it("returns the checkout destination after a customer completes onboarding", () => {
    expect(getPostOnboardingRedirectTarget("/gio-hang")).toBe("/gio-hang");
  });

  it("preserves a booking destination and its service query", () => {
    expect(
      getPostOnboardingRedirectTarget("/dat-lich?service=spa-dog"),
    ).toBe("/dat-lich?service=spa-dog");
  });

  it("rejects external and profile destinations", () => {
    expect(getPostOnboardingRedirectTarget("//outside.example")).toBeNull();
    expect(getPostOnboardingRedirectTarget("/tai-khoan")).toBeNull();
    expect(getPostOnboardingRedirectTarget(null)).toBeNull();
  });

  it("does not treat pets that are still loading as a new account", () => {
    expect(
      shouldOpenOnboardingWalkthrough({
        hasWalkthroughParam: false,
        needsPhone: false,
        isCompleted: false,
        hasLoadedPets: false,
        petCount: undefined,
      }),
    ).toBe(false);
  });

  it("does not treat a failed pet request as an empty pet list", () => {
    expect(
      shouldOpenOnboardingWalkthrough({
        hasWalkthroughParam: false,
        needsPhone: false,
        isCompleted: false,
        hasLoadedPets: false,
        petCount: undefined,
      }),
    ).toBe(false);
  });

  it("does not reopen onboarding for an existing customer with pets", () => {
    expect(
      shouldOpenOnboardingWalkthrough({
        hasWalkthroughParam: false,
        needsPhone: false,
        isCompleted: false,
        hasLoadedPets: true,
        petCount: 2,
      }),
    ).toBe(false);
  });

  it("opens onboarding for a new customer after confirming they have no pets", () => {
    expect(
      shouldOpenOnboardingWalkthrough({
        hasWalkthroughParam: false,
        needsPhone: false,
        isCompleted: false,
        hasLoadedPets: true,
        petCount: 0,
      }),
    ).toBe(true);
  });

  it("opens onboarding when explicitly requested or phone information is missing", () => {
    const base = {
      isCompleted: true,
      hasLoadedPets: false,
      petCount: undefined,
    };

    expect(
      shouldOpenOnboardingWalkthrough({
        ...base,
        hasWalkthroughParam: true,
        needsPhone: false,
      }),
    ).toBe(true);
    expect(
      shouldOpenOnboardingWalkthrough({
        ...base,
        hasWalkthroughParam: false,
        needsPhone: true,
      }),
    ).toBe(true);
  });
});
