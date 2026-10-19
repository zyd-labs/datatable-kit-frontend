import { resolveDatatableHttpClient } from '../http-client';
import type { DataTableLoadResult, DataTableResponse } from '../types/datatable';

export interface DatatableRequestParams extends Record<string, unknown> { }

export function useDatatable(endpoint: string) {
    const fetchData = async <T, TMeta = unknown>(
        params: DatatableRequestParams,
    ): Promise<DataTableLoadResult<T, TMeta>> => {
        const client = resolveDatatableHttpClient();
        const { data } = await client.get<DataTableResponse<T, TMeta>>(endpoint, { params });

        return {
            data: data.data,
            total: data.total,
            meta: data.meta,
        };
    };

    const exportData = async (params: DatatableRequestParams) => {
        const client = resolveDatatableHttpClient();

        return client.get<Blob>(endpoint, {
            params,
            responseType: 'blob',
            headers: {
                Accept: 'application/octet-stream',
            },
        });
    };

    return {
        fetchData,
        exportData,
    };
}

