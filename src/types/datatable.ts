import type { Component } from 'vue';

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
    filterType?: 'select' | 'multi-select';
    filterOptions?: ColumnFilterOption[];
    operator?: 'and' | 'or';
    showMatchModes?: boolean;
    showOperator?: boolean;
    placeholder?: string;
    maxSelectedLabels?: number;
}

export interface ColumnDef {
    field: string;
    header: string;
    sortable?: boolean;
    filter?: boolean | ColumnFilterConfig;
    visible?: boolean;
    dataType?: 'text' | 'numeric' | 'date' | 'boolean' | 'multi-select';
    render?: ((data: unknown) => unknown) | Component;
    defaultFilter?: ColumnDefaultFilter;
}

