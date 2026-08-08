import type { ColumnDef } from '../types/datatable';

export type ColumnVisibilityState = {
    hidden: string[];
    version: 2;
};

export const defaultVisibleColumnFields = (columns: ColumnDef[]): string[] => {
    return columns.filter((column) => column.visible !== false).map((column) => column.field);
};

export const resolveVisibleColumnsFromHidden = (columns: ColumnDef[], hidden: string[]): string[] => {
    const hiddenSet = new Set(hidden);
    return defaultVisibleColumnFields(columns).filter((field) => !hiddenSet.has(field));
};

export const resolveHiddenFromVisible = (columns: ColumnDef[], visible: string[]): string[] => {
    const visibleSet = new Set(visible);
    return defaultVisibleColumnFields(columns).filter((field) => !visibleSet.has(field));
};

export const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((value, index) => value === b[index]);
};

export const migrateOldVisibilityFormat = (raw: unknown, columns: ColumnDef[]): string[] => {
    const defaultVisible = defaultVisibleColumnFields(columns);

    if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) {
        const legacyVisible = raw.filter((item): item is string => typeof item === 'string');
        return defaultVisible.filter((field) => !legacyVisible.includes(field));
    }

    if (typeof raw === 'object' && raw !== null) {
        const rawState = raw as Record<string, unknown>;
        const visible = Array.isArray(rawState.visible)
            ? rawState.visible.filter((item): item is string => typeof item === 'string')
            : [];
        return defaultVisible.filter((field) => !visible.includes(field));
    }

    return [];
};

export const readHiddenColumnState = (storageKey: string, columns: ColumnDef[]): string[] => {
    try {
        const rawValue = localStorage.getItem(storageKey);
        if (!rawValue) {
            return [];
        }

        const parsed = JSON.parse(rawValue);

        if (typeof parsed === 'object' && parsed !== null && parsed.version === 2 && Array.isArray(parsed.hidden)) {
            return parsed.hidden.filter((item): item is string => typeof item === 'string');
        }

        return migrateOldVisibilityFormat(parsed, columns);
    } catch (error) {
        console.warn('localStorage okuma hatası:', error);
        return [];
    }
};

export const writeHiddenColumnState = (
    storageKey: string,
    hidden: string[],
    previous: ColumnVisibilityState | null,
): ColumnVisibilityState => {
    const normalizedHidden = Array.from(
        new Set(hidden.filter((field): field is string => typeof field === 'string' && field.trim() !== '')),
    );

    const nextState: ColumnVisibilityState = {
        hidden: normalizedHidden,
        version: 2,
    };

    if (previous && arraysEqual(previous.hidden, nextState.hidden)) {
        return nextState;
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch (error) {
        console.warn('localStorage yazma hatası:', error);
    }

    return nextState;
};
