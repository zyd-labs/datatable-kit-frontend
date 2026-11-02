import { resolveDatatableHttpClient } from '../http-client';
import type { DataTableLoadResult, DataTableResponse } from '../types/datatable';

export interface DatatableRequestParams extends Record<string, unknown> { }

export function useDatatable(endpoint: string) {
    const fetchData = async <T, TMeta = unknown>(
        params: DatatableRequestParams,
        signal?: AbortSignal,
    ): Promise<DataTableLoadResult<T, TMeta>> => {
        const client = resolveDatatableHttpClient();
        const { data } = await client.get<DataTableResponse<T, TMeta>>(endpoint, {
            params,
            ...(signal ? { signal } : {}),
        });

        return {
            data: data.data,
            total: data.total,
            meta: data.meta,
        };
    };

    const exportData = async (params: DatatableRequestParams, signal?: AbortSignal) => {
        const client = resolveDatatableHttpClient();

        return client.get<Blob>(endpoint, {
            params,
            ...(signal ? { signal } : {}),
            responseType: 'blob',
            headers: {
                Accept: 'application/octet-stream',
            },
        });
    };

    return {
        fetchData,
        exportData,
        getRequestContext: () => resolveDatatableHttpClient().getRequestContext?.(endpoint) ?? { allowed: true },
    };
}
