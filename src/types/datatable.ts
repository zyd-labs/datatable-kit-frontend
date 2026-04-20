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

export interface DataTableResponse<T> {
    data: T[];
    total: number;
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
    filterType?: 'text' | 'select' | 'multi-select' | 'lookup' | 'lookup-multiple' | 'date' | 'date-range' | 'boolean';
    filterMatchMode?: MatchMode;
    filterOptions?: ColumnFilterOption[];
    filterOptionLabel?: string;
    filterOptionValue?: string;
    lookupEndpoint?: string;
    lookupParams?: Record<string, unknown>;
    lookupOptionLabel?: string;
    lookupOptionValue?: string;
    filterPlaceholder?: string;
    operator?: 'and' | 'or';
    showMatchModes?: boolean;
    showOperator?: boolean;
    placeholder?: string;
    maxSelectedLabels?: number;
    constraints?: Array<{ value: unknown; matchMode: MatchMode }>;
}

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
}

