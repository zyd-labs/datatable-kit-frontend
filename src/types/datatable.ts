import type { Component, VNode } from 'vue';

export type MatchMode =
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'equals'
    | 'notEquals'
    | 'notContains'
    | 'lt'
    | 'lte'
    | 'gt'
    | 'gte'
    | 'between'
    | 'in'
    | 'dateIs'
    | 'dateIsNot'
    | 'dateBefore'
    | 'dateAfter';

export interface FilterConstraint {
    value: unknown;
    matchMode: MatchMode;
    displayValue?: string | string[] | null;
}

export interface DataTableFilter {
    operator: 'and' | 'or';
    constraints: FilterConstraint[];
}

export interface DataTableState {
    first: number;
    rows: number;
    sortField?: string;
    sortOrder?: 1 | -1;
    filters: Record<string, DataTableFilter>;
    globalFilter?: string;
}

export interface DataTableResponse<T, TMeta = unknown> {
    data: T[];
    total: number;
    meta?: TMeta;
}

/**
 * Successful BaseDataTable load payload (generic metadata passthrough).
 */
export interface DataTableLoadResult<T = unknown, TMeta = unknown> {
    data: T[];
    total: number;
    meta?: TMeta;
}

export interface ColumnDefaultFilter {
    operator?: 'and' | 'or';
    constraints: Array<{ value: unknown; matchMode: MatchMode }>;
}

export interface ColumnFilterOption {
    label: string;
    value: unknown;
}

export interface ColumnFilterConfig {
    filterType?: 'text' | 'numeric' | 'select' | 'multi-select' | 'lookup' | 'lookup-multiple' | 'date' | 'date-range' | 'boolean';
    /** When true, InputNumber uses decimal mode (currency/rate/qty). Default: integer-friendly. */
    numericMode?: 'decimal' | 'currency' | 'integer';
    minFractionDigits?: number;
    maxFractionDigits?: number;
    currency?: string;
    locale?: string;
    filterMatchMode?: MatchMode;
    filterOptions?: ColumnFilterOption[];
    filterOptionLabel?: string;
    filterOptionValue?: string;
    lookupEndpoint?: string;
    lookupParams?: Record<string, unknown>;
    lookupOptionLabel?: string;
    lookupOptionValue?: string;
    /** Optional fetcher that adapts app list APIs into LookupSelect responses. */
    lookupFetcher?: (params: {
        endpoint: string;
        q?: string;
        page?: number;
        perPage?: number;
        selected?: Array<string | number>;
        exclude?: Array<string | number>;
        filters?: Record<string, unknown>;
        signal?: AbortSignal;
    }) => Promise<{
        data: Array<{ value: string | number; label: string; meta?: Record<string, unknown> }>;
        pagination: {
            page: number;
            per_page: number;
            has_more: boolean;
            total?: number | null;
        };
    }>;
    filterPlaceholder?: string;
    operator?: 'and' | 'or';
    showMatchModes?: boolean;
    showOperator?: boolean;
    placeholder?: string;
    maxSelectedLabels?: number;
    constraints?: Array<{ value: unknown; matchMode: MatchMode }>;
}

export type ColumnCardRole =
    | 'title'
    | 'subtitle'
    | 'meta'
    | 'badge';

export type ColumnMobileRole = ColumnCardRole;

export interface ColumnCardConfig {
    visible?: boolean;
    role?: ColumnCardRole;
    order?: number;
    label?: string;
}

export interface ColumnMobileConfig {
    visible?: boolean;
    role?: ColumnMobileRole;
    order?: number;
    label?: string;
}

export type DataViewMode = 'table' | 'cards';

export type CardLayout = 'list' | 'grid';

export type ResponsiveMode = 'table' | 'adaptive';

export interface ColumnDef {
    field: string;
    filterField?: string;
    header: string;
    sortable?: boolean;
    filter?: boolean | ColumnFilterConfig;
    visible?: boolean;
    dataType?: 'text' | 'numeric' | 'date' | 'boolean' | 'multi-select';
    render?: ((data: unknown) => string | VNode) | Component;
    defaultFilter?: ColumnDefaultFilter;
    card?: ColumnCardConfig;
    mobile?: ColumnMobileConfig;
}

export interface CardClickPayload {
    data: unknown;
    originalEvent: Event;
}

export type DataTableRowClass = string | string[] | Record<string, boolean>;

export type DataTableRowClassResolver = (
    data: Record<string, unknown>,
) => DataTableRowClass | undefined;

export interface ControlledSort {
    field?: string;
    order?: 1 | -1;
}

export interface ActiveFilterRow {
    key: string;
    field: string;
    label: string;
    value: string;
    constraintIndex: number;
}

export const DATATABLE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
