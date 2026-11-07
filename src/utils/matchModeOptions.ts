import type { ColumnDef, MatchMode } from '../types/datatable';
import { getAllowedMatchModes } from './columnFilters';

export const MATCH_MODE_LABELS: Record<MatchMode, string> = {
    contains: 'İçerir',
    startsWith: 'İle başlar',
    endsWith: 'İle biter',
    equals: 'Eşittir',
    notEquals: 'Eşit değildir',
    notContains: 'İçermez',
    lt: 'Küçüktür',
    lte: 'Küçük eşittir',
    gt: 'Büyüktür',
    gte: 'Büyük eşittir',
    between: 'Arasında',
    in: 'İçinde',
    dateIs: 'Tarih eşit',
    dateIsNot: 'Tarih eşit değil',
    dateBefore: 'Öncesi',
    dateAfter: 'Sonrası',
};

export type MatchModeOption = {
    label: string;
    value: MatchMode;
};

export const getMatchModeOptions = (column: ColumnDef): MatchModeOption[] => {
    return getAllowedMatchModes(column).map((value) => ({
        label: MATCH_MODE_LABELS[value],
        value,
    }));
};

/**
 * Keep filter values coherent when switching to/from `between`.
 */
export const adaptConstraintValueForMatchMode = (
    previousMode: MatchMode | null | undefined,
    nextMode: MatchMode,
    value: unknown,
): unknown => {
    if (previousMode === 'between' && nextMode !== 'between') {
        return Array.isArray(value) ? (value[0] ?? null) : value;
    }

    if (previousMode !== 'between' && nextMode === 'between') {
        if (Array.isArray(value) && value.length === 2) {
            return value;
        }

        return [value ?? null, null];
    }

    return value;
};
