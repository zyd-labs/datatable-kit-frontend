import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createLoadedPayload } from '../loadedEvent';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseDataTableSource = readFileSync(
    resolve(packageRoot, 'components/BaseDataTable.vue'),
    'utf8',
);

describe('createLoadedPayload', () => {
    it('includes data and total, and forwards optional meta', () => {
        expect(createLoadedPayload({ data: [{ id: 7 }], total: 1, meta: { page: 2 } })).toEqual({
            data: [{ id: 7 }],
            total: 1,
            meta: { page: 2 },
        });
    });
});

describe('BaseDataTable loaded contract', () => {
    it('declares a typed loaded emit and fires it after a successful fetch', () => {
        expect(baseDataTableSource).toContain("(e: 'loaded', payload: DataTableLoadResult): void;");
        expect(baseDataTableSource).toContain("emit('loaded', createLoadedPayload(result));");
        expect(baseDataTableSource).toContain('import { createLoadedPayload } from \'../utils/loadedEvent\';');
    });

    it('routes initial load, filtering, pagination, and refresh through fetchData', () => {
        const triggers = [
            { name: 'onMounted initial load', pattern: /onMounted\(\(\) => \{[\s\S]*?fetchData\(\);\n\}\);/ },
            { name: 'pagination', pattern: /const onPage = [\s\S]*?fetchData\(\);/ },
            { name: 'filtering', pattern: /const applyFilterChange = [\s\S]*?fetchData\(\);/ },
            { name: 'refresh', pattern: /const refreshData = \(\) => \{[\s\S]*?fetchData\(\);\n\};/ },
        ];

        for (const trigger of triggers) {
            expect(baseDataTableSource, trigger.name).toMatch(trigger.pattern);
        }

        const fetchDataBody = baseDataTableSource.match(
            /const fetchData = async \(\) => \{([\s\S]*?)\n\};/,
        )?.[1];

        expect(fetchDataBody).toBeTruthy();
        expect(fetchDataBody).toContain("emit('loaded', createLoadedPayload(result));");
        expect(fetchDataBody).not.toMatch(/catch[\s\S]*emit\('loaded'/);
    });
});
