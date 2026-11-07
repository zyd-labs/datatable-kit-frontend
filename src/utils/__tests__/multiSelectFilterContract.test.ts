import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '../../types/datatable';
import {
    getDefaultMatchMode,
    resolveFilterType,
    resolveNestedFilterOverlayAppendTo,
} from '../columnFilters';
import { mergeControlledFilters, normalizeFilterForColumn } from '../controlledFilters';
import { cleanFilters } from '../filterPayload';

const filterFieldSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../components/internal/DataTableFilterField.vue'),
    'utf8',
);

describe('DataTable multi-select filter contract', () => {
    const statusColumn: ColumnDef = {
        field: 'status',
        header: 'Durum',
        filter: {
            filterType: 'multi-select',
            filterOptions: [
                { label: 'Opsiyon', value: 'option' },
                { label: 'Kesinleşti', value: 'confirmed' },
                { label: 'Tamamlandı', value: 'completed' },
                { label: 'İptal', value: 'cancelled' },
            ],
            showMatchModes: false,
            showOperator: false,
        },
    };

    it('defaults multi-select to in match mode', () => {
        expect(resolveFilterType(statusColumn)).toBe('multi-select');
        expect(getDefaultMatchMode(statusColumn)).toBe('in');
        expect(resolveNestedFilterOverlayAppendTo('multi-select')).toBe('self');
    });

    it('wires MultiSelect/Select/DatePicker to nestedOverlayAppendTo (self)', () => {
        const multiSelectBlock = filterFieldSource.match(/<MultiSelect[\s\S]*?\/>/)?.[0] ?? '';
        expect(multiSelectBlock).toContain(':appendTo="nestedOverlayAppendTo"');
        expect(multiSelectBlock).toContain('onMultiSelectUpdate');

        const selectBlock = filterFieldSource.match(/<Select[\s\S]*?\/>/)?.[0] ?? '';
        expect(selectBlock).toContain(':appendTo="nestedOverlayAppendTo"');
        expect(filterFieldSource).toContain('resolveNestedFilterOverlayAppendTo');
    });

    it('coerces date filter strings through toDatePickerModel for DatePicker', () => {
        expect(filterFieldSource).toContain("from '../../utils/filterPayload'");
        expect(filterFieldSource).toContain('toDatePickerModel');
        expect(filterFieldSource).toContain(':model-value="datePickerModel as Date | null"');
        expect(filterFieldSource).toContain(':model-value="datePickerModel as Date | Date[] | null"');
    });

    it('preserves option / confirmed selections through controlled merge + cleanFilters', () => {
        const afterOption = normalizeFilterForColumn(statusColumn, {
            operator: 'and',
            constraints: [{ matchMode: 'in', value: ['option'] }],
        });
        expect(afterOption.constraints[0]).toEqual({ matchMode: 'in', value: ['option'] });

        const afterBoth = normalizeFilterForColumn(statusColumn, {
            operator: 'and',
            constraints: [{ matchMode: 'in', value: ['option', 'confirmed'] }],
        });
        expect(afterBoth.constraints[0]?.value).toEqual(['option', 'confirmed']);

        const cleared = normalizeFilterForColumn(statusColumn, {
            operator: 'and',
            constraints: [{ matchMode: 'in', value: [] }],
        });
        expect(cleanFilters({ status: cleared }).status).toBeUndefined();

        const merged = mergeControlledFilters({
            current: {
                status: {
                    operator: 'and',
                    constraints: [{ matchMode: 'in', value: ['option', 'confirmed'] }],
                },
            },
            incoming: {
                status: {
                    operator: 'and',
                    constraints: [{ matchMode: 'in', value: ['option'] }],
                },
            },
            previousKeys: ['status'],
            columns: [statusColumn],
        });

        expect(merged.filters.status.constraints[0]).toEqual({
            matchMode: 'in',
            value: ['option'],
        });
    });

    it('does not let scalar equals controlled filters crash multi-select contract', () => {
        const merged = mergeControlledFilters({
            current: {},
            incoming: {
                status: {
                    operator: 'and',
                    constraints: [{ matchMode: 'equals', value: 'option' }],
                },
            },
            previousKeys: [],
            columns: [statusColumn],
        });

        expect(merged.filters.status.constraints[0]).toEqual({
            matchMode: 'in',
            value: ['option'],
        });
        expect(cleanFilters(merged.filters).status?.constraints[0]?.value).toEqual(['option']);
    });
});
