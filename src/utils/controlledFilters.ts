import type { ColumnDef, DataTableFilter, FilterConstraint } from '../types/datatable';
import {
    getDefaultMatchMode,
    getFilterConfig,
    resolveFilterKey,
    resolveFilterType,
} from './columnFilters';

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

/**
 * Coerce multi-select / lookup-multiple constraints to `in` + array values
 * so controlled quick-filters using scalar `equals` do not crash MultiSelect.
 */
export function normalizeFilterForColumn(
    column: ColumnDef,
    filter: DataTableFilter,
): DataTableFilter {
    const filterType = resolveFilterType(column);
    if (filterType !== 'multi-select' && filterType !== 'lookup-multiple') {
        return filter;
    }

    const constraints = (filter.constraints ?? []).map((constraint): FilterConstraint => {
        const rawValue = constraint.value;
        let value: unknown = rawValue;
        if (rawValue == null || rawValue === '') {
            value = null;
        } else if (!Array.isArray(rawValue)) {
            value = [rawValue];
        }

        return {
            ...constraint,
            matchMode: constraint.matchMode === 'equals' || !constraint.matchMode
                ? 'in'
                : constraint.matchMode,
            value,
        };
    });

    return {
        ...filter,
        constraints,
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
        if (!value?.constraints?.length) {
            return;
        }

        const column = findColumnByFilterKey(options.columns, key);
        next[key] = column ? normalizeFilterForColumn(column, value) : value;
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
