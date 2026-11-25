"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { usePathname } from "next/navigation";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function useScrollReveal(
  selector: string = ".reveal",
  options: {
    y?: number;
    x?: number;
    duration?: number;
    stagger?: number;
    ease?: string;
    start?: string;
  } = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  
  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = gsap.utils.toArray<HTMLElement>(selector, container);
    
    if (elements.length > 0) {
      gsap.from(elements, {
        y: options.y ?? 50,
        x: options.x ?? 0,
        opacity: 0,
        duration: options.duration ?? 0.8,
        stagger: options.stagger ?? 0.1,
        ease: options.ease ?? "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: options.start ?? "top 80%",
        }
      });
    }
  }, { scope: containerRef, dependencies: [pathname], revertOnUpdate: true });
  
  return containerRef;
}
