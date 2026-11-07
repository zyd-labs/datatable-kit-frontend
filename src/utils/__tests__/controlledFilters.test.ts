import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '../../types/datatable';
import { mergeControlledFilters, normalizeFilterForColumn } from '../controlledFilters';

describe('normalizeFilterForColumn multi-select', () => {
    const column: ColumnDef = {
        field: 'status',
        header: 'Durum',
        filter: { filterType: 'multi-select' },
    };

    it('coerces scalar equals into in + array', () => {
        const normalized = normalizeFilterForColumn(column, {
            operator: 'and',
            constraints: [{ matchMode: 'equals', value: 'option' }],
        });

        expect(normalized.constraints[0]).toEqual({
            matchMode: 'in',
            value: ['option'],
        });
    });

    it('keeps existing in arrays', () => {
        const normalized = normalizeFilterForColumn(column, {
            operator: 'and',
            constraints: [{ matchMode: 'in', value: ['option', 'confirmed'] }],
        });

        expect(normalized.constraints[0]).toEqual({
            matchMode: 'in',
            value: ['option', 'confirmed'],
        });
    });
});

describe('mergeControlledFilters', () => {
    it('normalizes incoming multi-select controlled filters', () => {
        const columns: ColumnDef[] = [
            {
                field: 'status',
                header: 'Durum',
                filter: { filterType: 'multi-select' },
            },
        ];

        const merged = mergeControlledFilters({
            current: {},
            incoming: {
                status: {
                    operator: 'and',
                    constraints: [{ matchMode: 'equals', value: 'option' }],
                },
            },
            previousKeys: [],
            columns,
        });

        expect(merged.filters.status.constraints[0]).toEqual({
            matchMode: 'in',
            value: ['option'],
        });
    });
});
