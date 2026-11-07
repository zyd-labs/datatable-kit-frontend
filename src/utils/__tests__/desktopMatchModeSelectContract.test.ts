import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '../../types/datatable';
import { getAllowedMatchModes, shouldShowMatchModes, shouldShowOperator } from '../columnFilters';
import { adaptConstraintValueForMatchMode, getMatchModeOptions } from '../matchModeOptions';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const desktopSource = readFileSync(resolve(root, 'components/internal/DataTableDesktop.vue'), 'utf8');
const mobileSource = readFileSync(resolve(root, 'components/internal/DataTableMobileFilters.vue'), 'utf8');
const filterFieldSource = readFileSync(resolve(root, 'components/internal/DataTableFilterField.vue'), 'utf8');

describe('desktop built-in ColumnFilter + mobile match-mode helpers', () => {
    it('restores PrimeVue built-in match-mode/operator Column props', () => {
        expect(desktopSource).toContain(
            ':showFilterMatchModes="col.filter === false ? false : !(getFilterConfig(col)?.showMatchModes === false)"',
        );
        expect(desktopSource).toContain(
            ':showFilterOperator="col.filter === false ? false : !(getFilterConfig(col)?.showOperator === false)"',
        );
        expect(desktopSource).not.toContain('getMatchModeOptions(col)');
        expect(desktopSource).not.toContain('onMatchModeUpdate');
        expect(desktopSource).not.toContain('onOperatorUpdate');
    });

    it('keeps filter slot bound to filterModel value and matchMode', () => {
        expect(desktopSource).toContain(':model-value="filterModel.value"');
        expect(desktopSource).toContain(':match-mode="filterModel.matchMode"');
        expect(desktopSource).toContain('DataTableFilterField');
    });

    it('keeps MultiSelect appendTo nesting fix in FilterField', () => {
        expect(filterFieldSource).toContain('resolveNestedFilterOverlayAppendTo');
        expect(filterFieldSource).toMatch(/<MultiSelect[\s\S]*:appendTo="nestedOverlayAppendTo"/);
    });

    it('keeps shared match-mode helpers for mobile filters', () => {
        expect(mobileSource).toContain("from '../../utils/matchModeOptions'");
        expect(mobileSource).toContain('getMatchModeOptions(column)');
        expect(mobileSource).toContain('adaptConstraintValueForMatchMode');

        const dateColumn: ColumnDef = {
            field: 'event_date',
            header: 'Tarih',
            dataType: 'date',
            filter: { filterType: 'date' },
        };
        expect(shouldShowMatchModes(dateColumn)).toBe(true);
        expect(getAllowedMatchModes(dateColumn)).toContain('dateBefore');
        expect(getMatchModeOptions(dateColumn).some((option) => option.value === 'dateAfter')).toBe(true);
        expect(adaptConstraintValueForMatchMode('equals', 'between', 3)).toEqual([3, null]);
    });

    it('honors showMatchModes/showOperator false column config', () => {
        const statusColumn: ColumnDef = {
            field: 'status',
            header: 'Durum',
            filter: { filterType: 'multi-select', showMatchModes: false, showOperator: false },
        };
        expect(shouldShowMatchModes(statusColumn)).toBe(false);
        expect(shouldShowOperator(statusColumn)).toBe(false);
    });
});
