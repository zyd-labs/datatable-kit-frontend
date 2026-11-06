import { describe, expect, it } from 'vitest';
import type { ColumnDef, DataTableFilter } from '../../types/datatable';
import { mergeControlledFilters, mergeRequestFilters } from '../controlledFilters';

const statusColumn: ColumnDef = {
    field: 'status',
    header: 'Durum',
    filter: { filterType: 'select', filterMatchMode: 'equals' },
};

const equals = (value: string): DataTableFilter => ({
    operator: 'and',
    constraints: [{ value, matchMode: 'equals' }],
});

describe('mergeControlledFilters', () => {
    it('updates a column filter without dropping unrelated filters', () => {
        const current: Record<string, DataTableFilter> = {
            status: equals('paid'),
            name: {
                operator: 'and',
                constraints: [{ value: 'Ada', matchMode: 'contains' }],
            },
        };

        const result = mergeControlledFilters({
            current,
            incoming: { status: equals('pending') },
            previousKeys: ['status'],
            columns: [statusColumn, { field: 'name', header: 'Ad' }],
        });

        expect(result.filters.status).toEqual(equals('pending'));
        expect(result.filters.name.constraints[0].value).toBe('Ada');
        expect(result.keys).toEqual(['status']);
    });

    it('keeps backend filters that are not columns', () => {
        const result = mergeControlledFilters({
            current: {},
            incoming: { due_bucket: equals('overdue') },
            previousKeys: [],
            columns: [statusColumn],
        });

        expect(result.filters.due_bucket).toEqual(equals('overdue'));
    });

    it('clears a previous controlled column filter when the key disappears', () => {
        const result = mergeControlledFilters({
            current: { status: equals('paid') },
            incoming: {},
            previousKeys: ['status'],
            columns: [statusColumn],
        });

        expect(result.filters.status.constraints[0].value).toBeNull();
        expect(result.keys).toEqual([]);
    });
});

describe('mergeRequestFilters', () => {
    it('lets extra filters override the same key and keeps both sets', () => {
        expect(mergeRequestFilters(
            { status: equals('paid') },
            { due_bucket: equals('upcoming') },
        )).toEqual({
            status: equals('paid'),
            due_bucket: equals('upcoming'),
        });
    });
});
