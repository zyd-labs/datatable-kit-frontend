import type { DataViewMode, ResponsiveMode } from '../types/datatable';

export const DEFAULT_CARD_MIN_WIDTH = 320;
export const DEFAULT_CARD_GAP = 12;

/**
 * Presentation-only resolver. Does not touch fetch/pagination/filter/sort state.
 *
 * - `viewMode="cards"` wins on every viewport.
 * - `viewMode="table"` + `responsiveMode="adaptive"` uses cards below the breakpoint.
 * - otherwise table.
 */
export const resolvePresentationMode = (
    viewMode: DataViewMode,
    responsiveMode: ResponsiveMode,
    isMobileViewport: boolean,
): DataViewMode => {
    if (viewMode === 'cards') {
        return 'cards';
    }

    if (responsiveMode === 'adaptive' && isMobileViewport) {
        return 'cards';
    }

    return 'table';
};
