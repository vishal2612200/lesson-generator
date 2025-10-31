export function nowMs(): number {
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		return performance.now()
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { performance } = require('perf_hooks')
		return performance.now()
	} catch {}
	if (typeof process !== 'undefined' && (process as any).hrtime?.bigint) {
		return Number((process as any).hrtime.bigint()) / 1_000_000
	}
	return Date.now()
}

export function startTimer(): (meta?: Record<string, any>) => { ms: number } & Record<string, any> {
	const t0 = nowMs()
	return (meta: Record<string, any> = {}) => ({ ms: nowMs() - t0, ...meta })
}

export function startHrTimer(): (meta?: Record<string, any>) => { ms: number } & Record<string, any> {
	if (typeof process !== 'undefined' && (process as any).hrtime?.bigint) {
		const t0 = (process as any).hrtime.bigint()
		return (meta: Record<string, any> = {}) => ({ ms: Number((process as any).hrtime.bigint() - t0) / 1_000_000, ...meta })
	}
	return startTimer()
}

export async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
	const stop = startTimer()
	const result = await fn()
	return { result, ...stop() }
}
