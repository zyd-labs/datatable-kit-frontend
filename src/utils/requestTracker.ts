export function createRequestTracker() {
    let active: { key: string; controller: AbortController; signal: AbortSignal } | null = null;

    return {
        begin(key: string, context: { allowed: boolean; signal?: AbortSignal }) {
            if (!context.allowed || context.signal?.aborted) {
                return null;
            }
            if (active?.key === key && !active.signal.aborted) {
                return null;
            }
            active?.controller.abort();
            const controller = new AbortController();
            const signal = context.signal
                ? AbortSignal.any([controller.signal, context.signal])
                : controller.signal;
            const request = { key, controller, signal };
            active = request;

            return {
                signal,
                isCurrent: () => active === request && !signal.aborted,
                finish: () => {
                    if (active === request) {
                        active = null;
                    }
                },
            };
        },
        cancel() {
            active?.controller.abort();
            active = null;
        },
    };
}
