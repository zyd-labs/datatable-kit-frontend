import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '../../types/datatable';
import { shouldShowMatchModes } from '../columnFilters';
import {
    adaptConstraintValueForMatchMode,
    getMatchModeOptions,
    MATCH_MODE_LABELS,
} from '../matchModeOptions';

describe('matchModeOptions', () => {
    it('builds typed date options with shared labels', () => {
        const column: ColumnDef = {
            field: 'event_date',
            header: 'Tarih',
            dataType: 'date',
            filter: { filterType: 'date' },
        };

        expect(shouldShowMatchModes(column)).toBe(true);
        expect(getMatchModeOptions(column)).toEqual([
            { label: MATCH_MODE_LABELS.dateIs, value: 'dateIs' },
            { label: MATCH_MODE_LABELS.dateIsNot, value: 'dateIsNot' },
            { label: MATCH_MODE_LABELS.dateBefore, value: 'dateBefore' },
            { label: MATCH_MODE_LABELS.dateAfter, value: 'dateAfter' },
            { label: MATCH_MODE_LABELS.between, value: 'between' },
        ]);
        expect(MATCH_MODE_LABELS.dateBefore).toBe('Öncesi');
        expect(MATCH_MODE_LABELS.dateAfter).toBe('Sonrası');
    });

    it('builds numeric options including between', () => {
        const column: ColumnDef = {
            field: 'amount',
            header: 'Tutar',
            dataType: 'numeric',
            filter: { filterType: 'numeric' },
        };

        const modes = getMatchModeOptions(column).map((option) => option.value);
        expect(modes).toEqual(['equals', 'notEquals', 'lt', 'lte', 'gt', 'gte', 'between']);
    });

    it('hides match-mode picker for boolean/select/lookup', () => {
        expect(shouldShowMatchModes({
            field: 'is_active',
            header: 'Aktif',
            dataType: 'boolean',
            filter: { filterType: 'boolean' },
        })).toBe(false);

        expect(shouldShowMatchModes({
            field: 'status',
            header: 'Durum',
            filter: { filterType: 'multi-select', showMatchModes: false },
        })).toBe(false);
    });

    it('adapts values when entering and leaving between', () => {
        expect(adaptConstraintValueForMatchMode('equals', 'between', 10)).toEqual([10, null]);
        expect(adaptConstraintValueForMatchMode('dateIs', 'between', '2026-01-01')).toEqual(['2026-01-01', null]);
        expect(adaptConstraintValueForMatchMode('between', 'gte', [5, 20])).toBe(5);
        expect(adaptConstraintValueForMatchMode('between', 'dateBefore', [null, '2026-02-01'])).toBeNull();
        expect(adaptConstraintValueForMatchMode('gte', 'gt', 7)).toBe(7);
    });
});
