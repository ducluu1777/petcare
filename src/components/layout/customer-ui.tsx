import type { CSSProperties, ReactNode, Ref } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export function CustomerSiteFrame({
  children,
  className,
  containerRef,
}: {
  children: ReactNode;
  className?: string;
  containerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={containerRef}
      className={cn("site-page customer-site-frame flex min-h-dvh flex-col overflow-x-clip", className)}
    >
      <a className="customer-skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <Header />
      <div id="main-content" className="customer-site-frame__content">{children}</div>
      <Footer />
    </div>
  );
}

export function CustomerSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("customer-section-heading", className)}>
      <div className="customer-section-heading__copy">
        {eyebrow ? <p className="customer-section-heading__eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="customer-section-heading__description">{description}</p> : null}
      </div>
      {action ? <div className="customer-section-heading__action">{action}</div> : null}
    </div>
  );
}

export function CustomerFlowProgress({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <nav className="customer-flow-progress" aria-label="Tiến trình">
      <ol style={{ "--flow-step-count": steps.length } as CSSProperties}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const completed = stepNumber < currentStep;
          const current = stepNumber === currentStep;
          return (
            <li
              key={step}
              className={cn(
                "customer-flow-progress__step",
                completed && "is-complete",
                current && "is-current",
              )}
              aria-current={current ? "step" : undefined}
            >
              <span className="customer-flow-progress__marker">
                {completed ? <Check aria-hidden="true" /> : stepNumber}
              </span>
              <span className="customer-flow-progress__label">{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
