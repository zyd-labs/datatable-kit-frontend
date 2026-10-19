import type { DataTableLoadResult } from '../types/datatable';

/**
 * Builds the public `loaded` event payload from a successful fetch result.
 */
export function createLoadedPayload<T = unknown, TMeta = unknown>(
    result: DataTableLoadResult<T, TMeta>,
): DataTableLoadResult<T, TMeta> {
    return {
        data: result.data,
        total: result.total,
        meta: result.meta,
    };
}
