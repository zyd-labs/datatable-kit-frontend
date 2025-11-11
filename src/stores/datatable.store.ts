import { defineStore } from 'pinia';
import type { DataTableState } from '../types/datatable';

export interface DatatableTableState extends DataTableState {
    data: unknown[];
    total: number;
    loading: boolean;
    selectedColumns: string[];
}

interface DatatableState {
    tables: Record<string, DatatableTableState>;
}

export const useDatatableStore = defineStore('datatable', {
    state: (): DatatableState => ({
        tables: {},
    }),
    actions: {
        init(key: string, initialState: Partial<DataTableState>) {
            this.tables[key] = {
                first: 0,
                rows: 25,
                filters: {},
                sortField: undefined,
                sortOrder: undefined,
                ...initialState,
                data: [],
                total: 0,
                loading: false,
                selectedColumns: [],
            };
        },
        patch(key: string, delta: Partial<DatatableTableState>) {
            if (!this.tables[key]) {
                return;
            }

            Object.assign(this.tables[key], delta);
        },
    },
});

