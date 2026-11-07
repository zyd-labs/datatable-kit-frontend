import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const desktopSource = readFileSync(resolve(root, 'components/internal/DataTableDesktop.vue'), 'utf8');
const mobileSource = readFileSync(resolve(root, 'components/internal/DataTableMobileFilters.vue'), 'utf8');

describe('desktop/mobile match-mode Select contract', () => {
    it('disables PrimeVue built-in ColumnFilter match-mode/operator menus', () => {
        expect(desktopSource).toContain(':showFilterMatchModes="false"');
        expect(desktopSource).toContain(':showFilterOperator="false"');
    });

    it('renders nested match-mode Select with appendTo=self in the filter slot', () => {
        expect(desktopSource).toContain('getMatchModeOptions(col)');
        expect(desktopSource).toContain('shouldShowMatchModes(col)');
        expect(desktopSource).toContain('onMatchModeUpdate');
        expect(desktopSource).toMatch(/shouldShowMatchModes\(col\)[\s\S]*appendTo="self"/);
    });

    it('shares match-mode helpers with mobile filters', () => {
        expect(desktopSource).toContain("from '../../utils/matchModeOptions'");
        expect(mobileSource).toContain("from '../../utils/matchModeOptions'");
        expect(mobileSource).toContain('getMatchModeOptions(column)');
        expect(mobileSource).toContain('adaptConstraintValueForMatchMode');
        expect(mobileSource).toContain('appendTo="self"');
    });
});
