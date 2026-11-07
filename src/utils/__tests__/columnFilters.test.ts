import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '../../types/datatable';
import {
    getAllowedMatchModes,
    getDefaultMatchMode,
    resolveFilterType,
    shouldShowMatchModes,
} from '../columnFilters';

describe('columnFilters data-type defaults', () => {
    it('infers numeric filter type and equals default match mode', () => {
        const column: ColumnDef = {
            field: 'amount',
            header: 'Tutar',
            dataType: 'numeric',
            filter: true,
        };

        expect(resolveFilterType(column)).toBe('numeric');
        expect(getDefaultMatchMode(column)).toBe('equals');
        expect(getAllowedMatchModes(column)).toEqual([
            'equals',
            'notEquals',
            'lt',
            'lte',
            'gt',
            'gte',
            'between',
        ]);
        expect(shouldShowMatchModes(column)).toBe(true);
    });

    it('keeps text contains as default', () => {
        const column: ColumnDef = {
            field: 'name',
            header: 'Ad',
            filter: true,
        };

        expect(resolveFilterType(column)).toBe('text');
        expect(getDefaultMatchMode(column)).toBe('contains');
    });

    it('hides match-mode picker for boolean/select single-mode filters', () => {
        const column: ColumnDef = {
            field: 'is_active',
            header: 'Aktif',
            dataType: 'boolean',
            filter: {
                filterType: 'boolean',
                showMatchModes: false,
            },
        };

        expect(getAllowedMatchModes(column)).toEqual(['equals']);
        expect(shouldShowMatchModes(column)).toBe(false);
    });

    it('limits date operators to date-specific modes', () => {
        const column: ColumnDef = {
            field: 'due_date',
            header: 'Vade',
            dataType: 'date',
            filter: { filterType: 'date' },
        };

        expect(getDefaultMatchMode(column, { filterType: 'date' })).toBe('dateIs');
        expect(getAllowedMatchModes(column)).toEqual([
            'dateIs',
            'dateIsNot',
            'dateBefore',
            'dateAfter',
            'between',
        ]);
    });
});
