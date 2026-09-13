import type { ColumnCardConfig, ColumnCardRole, ColumnDef } from '../types/datatable';

export interface CardColumnItem {
    column: ColumnDef;
    role: ColumnCardRole;
    label: string;
    order: number;
    index: number;
}

const ROLE_PRIORITY: Record<ColumnCardRole, number> = {
    title: 0,
    subtitle: 1,
    badge: 2,
    meta: 3,
};

const resolveCardConfig = (column: ColumnDef): ColumnCardConfig => {
    return {
        visible: column.card?.visible ?? column.mobile?.visible,
        role: column.card?.role ?? column.mobile?.role,
        order: column.card?.order ?? column.mobile?.order,
        label: column.card?.label ?? column.mobile?.label,
    };
};

const isCardEligible = (column: ColumnDef): boolean => {
    const visible = resolveCardConfig(column).visible;

    if (visible === false) {
        return false;
    }

    if (visible === true) {
        return true;
    }

    return column.visible !== false;
};

const compareCardColumns = (a: CardColumnItem, b: CardColumnItem): number => {
    if (a.order !== b.order) {
        return a.order - b.order;
    }

    const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
    if (roleDiff !== 0) {
        return roleDiff;
    }

    return a.index - b.index;
};

/**
 * Automatic layout when neither `card.role` nor `mobile.role` is set:
 * first eligible column without an explicit role → title, remaining unroled columns → meta.
 * Explicit roles always win. If every eligible column has a non-title role, no title is invented.
 * Multiple titles: first is primary, extras become subtitles.
 */
export const resolveCardColumns = (columns: ColumnDef[]): CardColumnItem[] => {
    const eligible = columns
        .map((column, index) => ({ column, index, config: resolveCardConfig(column) }))
        .filter(({ column }) => isCardEligible(column));

    if (eligible.length === 0) {
        return [];
    }

    const hasExplicitTitle = eligible.some(({ config }) => config.role === 'title');
    const automaticTitleEligibleIndex = hasExplicitTitle
        ? -1
        : eligible.findIndex(({ config }) => !config.role);

    const items: CardColumnItem[] = eligible.map(({ column, index, config }, eligibleIndex) => {
        let role: ColumnCardRole;

        if (config.role) {
            role = config.role;
        } else if (eligibleIndex === automaticTitleEligibleIndex) {
            role = 'title';
        } else {
            role = 'meta';
        }

        return {
            column,
            role,
            label: config.label ?? column.header,
            order: config.order ?? index,
            index,
        };
    });

    return items.sort(compareCardColumns);
};

export interface CardFieldLayout {
    titles: CardColumnItem[];
    subtitles: CardColumnItem[];
    badges: CardColumnItem[];
    metas: CardColumnItem[];
}

export const buildCardLayout = (columns: ColumnDef[]): CardFieldLayout => {
    const resolved = resolveCardColumns(columns);
    const titles = resolved.filter((item) => item.role === 'title');
    const subtitles = resolved.filter((item) => item.role === 'subtitle');
    const badges = resolved.filter((item) => item.role === 'badge');
    const metas = resolved.filter((item) => item.role === 'meta');

    if (titles.length > 1) {
        const [primary, ...extraTitles] = titles;
        return {
            titles: primary ? [primary] : [],
            subtitles: [...extraTitles, ...subtitles],
            badges,
            metas,
        };
    }

    return {
        titles,
        subtitles,
        badges,
        metas,
    };
};

export const getNestedValue = (data: unknown, field: string): unknown => {
    if (!data || typeof data !== 'object') {
        return undefined;
    }

    if (!field.includes('.')) {
        return (data as Record<string, unknown>)[field];
    }

    return field.split('.').reduce<unknown>((current, key) => {
        if (!current || typeof current !== 'object') {
            return undefined;
        }

        return (current as Record<string, unknown>)[key];
    }, data);
};

export const isDisplayValueEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === 'string') {
        return value.trim() === '';
    }

    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    return false;
};

export const formatRawDisplayValue = (value: unknown): string | null => {
    if (isDisplayValueEmpty(value)) {
        return null;
    }

    if (value instanceof Date) {
        return value.toLocaleDateString('tr-TR');
    }

    if (typeof value === 'boolean') {
        return value ? 'Evet' : 'Hayır';
    }

    if (typeof value === 'number') {
        return String(value);
    }

    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(', ');
    }

    return null;
};
