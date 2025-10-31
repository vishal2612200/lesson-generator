export class PerformanceOptimizer {
  optimize(): void { /* no-op */ }
}

export class TimeoutManager {
  withTimeout<T>(promise: Promise<T>, _ms: number): Promise<T> { return promise }
}

export class GenerationSpeedOptimizer {
  adjust(): void { /* no-op */ }
}

export function generatePerformanceReport(): string {
  return 'ok'
}
