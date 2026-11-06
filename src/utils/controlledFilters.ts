import type { ColumnDef, DataTableFilter } from '../types/datatable';
import { getDefaultMatchMode, getFilterConfig, resolveFilterKey } from './columnFilters';

export function blankColumnFilter(column: ColumnDef): DataTableFilter {
    const filterConfig = getFilterConfig(column);

    return {
        operator: filterConfig?.operator || 'and',
        constraints: [
            {
                value: null,
                matchMode: getDefaultMatchMode(column, filterConfig),
            },
        ],
    };
}

export function findColumnByFilterKey(columns: ColumnDef[], key: string): ColumnDef | undefined {
    return columns.find((column) => resolveFilterKey(column) === key);
}

export function mergeControlledFilters(options: {
    current: Record<string, DataTableFilter>;
    incoming: Record<string, DataTableFilter>;
    previousKeys: string[];
    columns: ColumnDef[];
}): { filters: Record<string, DataTableFilter>; keys: string[] } {
    const next: Record<string, DataTableFilter> = { ...options.current };
    const incoming = options.incoming ?? {};

    options.previousKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(incoming, key)) {
            return;
        }

        const column = findColumnByFilterKey(options.columns, key);
        if (column && column.filter !== false) {
            next[key] = blankColumnFilter(column);
            return;
        }

        delete next[key];
    });

    Object.entries(incoming).forEach(([key, value]) => {
        if (value?.constraints?.length) {
            next[key] = value;
        }
    });

    return {
        filters: next,
        keys: Object.keys(incoming),
    };
}

export function mergeRequestFilters(
    columnFilters: Record<string, DataTableFilter>,
    extraFilters: Record<string, DataTableFilter>,
): Record<string, DataTableFilter> {
    return {
        ...columnFilters,
        ...extraFilters,
    };
}
