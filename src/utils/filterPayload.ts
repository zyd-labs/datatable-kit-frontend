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

    return false;
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

        const validConstraints = filter.constraints.filter(
            (constraint) => !isConstraintValueEmpty(constraint.value),
        );

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
