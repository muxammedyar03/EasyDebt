// Performance monitoring utilities
import { NextWebVitalsMetric } from "next/app";

export function measurePerformance(name: string) {
  if (typeof window === "undefined") return;

  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    },
  };
}

export function logSlowQuery(queryName: string, duration: number, threshold = 1000) {
  if (duration > threshold) {
    console.warn(`[Slow Query] ${queryName} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
  }
}

// Web Vitals reporting
export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (process.env.NODE_ENV === "development") {
    console.log(metric);
  }
}
