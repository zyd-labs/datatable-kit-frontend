import type { DataTableFilter, FilterConstraint } from '../types/datatable';

export const isConstraintValueEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === 'string') {
        return value.trim() === '';
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    // 0 and false are meaningful filter values
    return false;
};

export const isBetweenConstraintComplete = (value: unknown): boolean => {
    if (!Array.isArray(value) || value.length !== 2) {
        return false;
    }

    return !isConstraintValueEmpty(value[0]) && !isConstraintValueEmpty(value[1]);
};

export const formatDateValue = (value: unknown): unknown => {
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    if (typeof value === 'string' && value.includes('T')) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return formatDateValue(date);
        }
    }

    if (Array.isArray(value)) {
        return value.map((item) => formatDateValue(item));
    }

    return value;
};

/**
 * Coerce API / quick-filter date strings into Date instances for PrimeVue DatePicker.
 * Passing `YYYY-MM-DD` with `dateFormat="dd/mm/yy"` throws "Unexpected literal at position 2".
 */
export const parseFilterDate = (value: unknown): Date | null => {
    if (value == null || value === '') {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const localDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (localDateMatch) {
        const year = Number(localDateMatch[1]);
        const month = Number(localDateMatch[2]);
        const day = Number(localDateMatch[3]);

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        // Reject JS Date overflow (e.g. 2026-02-31 → March).
        const date = new Date(year, month - 1, day);
        if (
            Number.isNaN(date.getTime())
            || date.getFullYear() !== year
            || date.getMonth() !== month - 1
            || date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    const date = new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
};

export const toDatePickerModel = (value: unknown): Date | Date[] | null => {
    if (Array.isArray(value)) {
        return value.map((item) => parseFilterDate(item));
    }

    return parseFilterDate(value);
};

export const normalizePayloadConstraint = (constraint: FilterConstraint): FilterConstraint => {
    return {
        value: formatDateValue(constraint.value),
        matchMode: constraint.matchMode,
    };
};

export const cleanFilters = (rawFilters: Record<string, DataTableFilter>): Record<string, DataTableFilter> => {
    const cleaned: Record<string, DataTableFilter> = {};

    Object.keys(rawFilters).forEach((field) => {
        if (field === 'global') {
            return;
        }

        const filter = rawFilters[field];
        if (!filter || !filter.constraints) {
            return;
        }

        const validConstraints = filter.constraints.filter((constraint) => {
            if (constraint.matchMode === 'between') {
                return isBetweenConstraintComplete(constraint.value);
            }

            return !isConstraintValueEmpty(constraint.value);
        });

        if (validConstraints.length > 0) {
            cleaned[field] = {
                operator: filter.operator,
                constraints: validConstraints.map((constraint) => normalizePayloadConstraint(constraint)),
            };
        }
    });

    return cleaned;
};

export const formatFilterDisplayValue = (constraint: FilterConstraint): string => {
    const value = constraint.displayValue ?? constraint.value;

    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(', ');
    }

    if (value instanceof Date) {
        return value.toLocaleDateString('tr-TR');
    }

    if (typeof value === 'boolean') {
        return value ? 'Evet' : 'Hayır';
    }

    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return String(value);
};

export const countActiveFilterConstraints = (filters: Record<string, DataTableFilter>): number => {
    let count = 0;

    Object.entries(filters).forEach(([field, filter]) => {
        if (field === 'global' || !filter?.constraints?.length) {
            return;
        }

        filter.constraints.forEach((constraint) => {
            if (!isConstraintValueEmpty(constraint.value)) {
                count += 1;
            }
        });
    });

    return count;
};
