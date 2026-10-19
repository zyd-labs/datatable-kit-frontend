import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    registerDatatableHttpClient,
    resetDatatableHttpClient,
} from '../../http-client';
import { useDatatable } from '../useDatatable';

describe('useDatatable', () => {
    afterEach(() => {
        resetDatatableHttpClient();
        vi.restoreAllMocks();
    });

    it('maps a successful response to DataTableLoadResult with data, total, and meta', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                data: [{ id: 1 }, { id: 2 }],
                total: 42,
                meta: { next_cursor: 'abc' },
            },
        });
        registerDatatableHttpClient({ get });

        const { fetchData } = useDatatable('/items');
        const result = await fetchData({ first: 0, rows: 10 });

        expect(get).toHaveBeenCalledWith('/items', { params: { first: 0, rows: 10 } });
        expect(result).toEqual({
            data: [{ id: 1 }, { id: 2 }],
            total: 42,
            meta: { next_cursor: 'abc' },
        });
    });

    it('passes through undefined meta when the backend omits it', async () => {
        registerDatatableHttpClient({
            get: vi.fn().mockResolvedValue({
                data: { data: [], total: 0 },
            }),
        });

        const { fetchData } = useDatatable('/empty');
        await expect(fetchData({})).resolves.toEqual({
            data: [],
            total: 0,
            meta: undefined,
        });
    });
});
