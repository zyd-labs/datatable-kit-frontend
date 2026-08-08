import { FilterMatchMode } from '@primevue/core/api';
import type { ColumnDef, ColumnFilterConfig, DataTableFilter, MatchMode } from '../types/datatable';

export const getFilterConfig = (column: ColumnDef): ColumnFilterConfig | null => {
    return typeof column.filter === 'object' ? column.filter : null;
};

export const resolveFilterKey = (column: ColumnDef): string => {
    return column.filterField ?? column.field;
};

export const resolveFilterType = (column: ColumnDef): NonNullable<ColumnFilterConfig['filterType']> => {
    const filterConfig = getFilterConfig(column);
    if (filterConfig?.filterType) {
        return filterConfig.filterType;
    }

    if (column.dataType === 'boolean') {
        return 'boolean';
    }

    if (column.dataType === 'date') {
        return 'date';
    }

    return 'text';
};

export const getFilterOptions = (column: ColumnDef) => {
    return getFilterConfig(column)?.filterOptions ?? [];
};

export const getFilterOptionLabel = (column: ColumnDef): string => {
    return getFilterConfig(column)?.filterOptionLabel ?? 'label';
};

export const getFilterOptionValue = (column: ColumnDef): string => {
    return getFilterConfig(column)?.filterOptionValue ?? 'value';
};

export const resolveFilterPlaceholder = (column: ColumnDef, fallback = 'Seçiniz'): string => {
    const filterConfig = getFilterConfig(column);

    return filterConfig?.filterPlaceholder ?? filterConfig?.placeholder ?? fallback;
};

export const resolveSelectOptions = (column: ColumnDef) => {
    if (resolveFilterType(column) === 'boolean' && !getFilterConfig(column)?.filterOptions?.length) {
        return [
            { label: 'Evet', value: 1 },
            { label: 'Hayır', value: 0 },
        ];
    }

    return getFilterOptions(column);
};

export const resolveColumnDataType = (column: ColumnDef): string => {
    const filterType = resolveFilterType(column);
    if (filterType === 'date-range' || filterType === 'date') {
        return 'date';
    }

    return column.dataType || 'text';
};

export const getDefaultMatchMode = (column: ColumnDef, filter?: ColumnFilterConfig | null): MatchMode => {
    if (filter?.filterMatchMode) {
        return filter.filterMatchMode;
    }

    switch (resolveFilterType(column)) {
        case 'lookup':
        case 'select':
        case 'boolean':
            return FilterMatchMode.EQUALS as MatchMode;
        case 'lookup-multiple':
        case 'multi-select':
            return FilterMatchMode.IN as MatchMode;
        case 'date-range':
            return FilterMatchMode.BETWEEN as MatchMode;
        case 'date':
            return FilterMatchMode.DATE_IS as MatchMode;
        default:
            return FilterMatchMode.CONTAINS as MatchMode;
    }
};

export const buildFilterForColumn = (column: ColumnDef): DataTableFilter => {
    const filterConfig = getFilterConfig(column);
    if (column.defaultFilter) {
        return column.defaultFilter as DataTableFilter;
    }

    return {
        operator: filterConfig?.operator || 'and',
        constraints: [
            {
                value: null,
                matchMode: getDefaultMatchMode(column, filterConfig),
            },
        ],
    };
};

export const isFilterableColumn = (column: ColumnDef): boolean => {
    return column.filter !== false;
};
