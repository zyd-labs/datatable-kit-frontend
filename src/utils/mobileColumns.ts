import type { ColumnDef, ColumnMobileRole } from '../types/datatable';

export interface MobileColumnItem {
    column: ColumnDef;
    role: ColumnMobileRole;
    label: string;
    order: number;
    index: number;
}

const ROLE_PRIORITY: Record<ColumnMobileRole, number> = {
    title: 0,
    subtitle: 1,
    badge: 2,
    meta: 3,
};

const isMobileEligible = (column: ColumnDef): boolean => {
    if (column.mobile?.visible === false) {
        return false;
    }

    if (column.mobile?.visible === true) {
        return true;
    }

    return column.visible !== false;
};

const resolveRole = (column: ColumnDef, fallbackRole: ColumnMobileRole): ColumnMobileRole => {
    return column.mobile?.role ?? fallbackRole;
};

const compareMobileColumns = (a: MobileColumnItem, b: MobileColumnItem): number => {
    const orderA = a.order;
    const orderB = b.order;

    if (orderA !== orderB) {
        return orderA - orderB;
    }

    const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
    if (roleDiff !== 0) {
        return roleDiff;
    }

    return a.index - b.index;
};

export const resolveMobileColumns = (columns: ColumnDef[]): MobileColumnItem[] => {
    const eligible = columns
        .map((column, index) => ({ column, index }))
        .filter(({ column }) => isMobileEligible(column));

    if (eligible.length === 0) {
        return [];
    }

    const hasExplicitTitle = eligible.some(({ column }) => column.mobile?.role === 'title');

    const items: MobileColumnItem[] = eligible.map(({ column, index }, eligibleIndex) => {
        let role: ColumnMobileRole = resolveRole(column, 'meta');

        if (!hasExplicitTitle && eligibleIndex === 0 && !column.mobile?.role) {
            role = 'title';
        } else if (!column.mobile?.role && hasExplicitTitle) {
            role = 'meta';
        } else if (!column.mobile?.role && !hasExplicitTitle && eligibleIndex > 0) {
            role = 'meta';
        }

        return {
            column,
            role,
            label: column.mobile?.label ?? column.header,
            order: column.mobile?.order ?? index,
            index,
        };
    });

    return items.sort(compareMobileColumns);
};

export interface MobileCardLayout {
    titles: MobileColumnItem[];
    subtitles: MobileColumnItem[];
    badges: MobileColumnItem[];
    metas: MobileColumnItem[];
}

export const buildMobileCardLayout = (columns: ColumnDef[]): MobileCardLayout => {
    const resolved = resolveMobileColumns(columns);
    const titles = resolved.filter((item) => item.role === 'title');
    const subtitles = resolved.filter((item) => item.role === 'subtitle');
    const badges = resolved.filter((item) => item.role === 'badge');
    const metas = resolved.filter((item) => item.role === 'meta');

    // Multiple titles: first is primary, extras flow into subtitle area.
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
        // Avoid rendering raw objects without a renderer.
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
