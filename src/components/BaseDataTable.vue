<template>
    <div class="datatable-kit-root">
        <DataTableMobile
            v-if="useMobilePresentation"
            :columns="columns"
            :rows="mobileRows"
            :first="tableState?.first ?? 0"
            :rows-per-page="tableState?.rows ?? defaultRows"
            :total="tableState?.total ?? 0"
            :loading="Boolean(tableState?.loading)"
            :exporting="exporting"
            :global-search-value="globalSearchValue"
            :filters="filters"
            :active-filter-rows="activeFilterRows"
            :active-filter-count="activeFilterCount"
            :sort-field="tableState?.sortField"
            :sort-order="tableState?.sortOrder"
            :selection-mode="selectionMode"
            :selected-rows="selectedRows"
            :expanded-rows="expandedRowsModel"
            @update:global-search-value="onGlobalSearchValueUpdate"
            @update:filters="onMobileFiltersUpdate"
            @clear-filters="clearFilters"
            @clear-filter-constraint="onClearFilterConstraint"
            @refresh="refreshData"
            @export="exportTable"
            @page="onPage"
            @sort="onMobileSort"
            @toggle-selection="onMobileToggleSelection"
            @toggle-expand="onMobileToggleExpand"
        >
            <template v-if="$slots['header-actions']" #header-actions>
                <slot name="header-actions"></slot>
            </template>
            <template v-if="$slots['mobile-card']" #mobile-card="slotProps">
                <slot name="mobile-card" v-bind="slotProps"></slot>
            </template>
            <template v-if="$slots.actions" #actions="slotProps">
                <slot name="actions" v-bind="slotProps"></slot>
            </template>
            <template v-if="$slots.expansion" #expansion="slotProps">
                <slot name="expansion" v-bind="slotProps"></slot>
            </template>
            <template v-if="$slots.empty" #empty="slotProps">
                <slot name="empty" v-bind="slotProps"></slot>
            </template>
        </DataTableMobile>

        <DataTableDesktop
            v-else
            ref="desktopRef"
            :data="tableState?.data ?? []"
            :first="tableState?.first ?? 0"
            :rows="tableState?.rows ?? defaultRows"
            :total="tableState?.total ?? 0"
            :loading="Boolean(tableState?.loading)"
            :exporting="exporting"
            :sort-field="tableState?.sortField"
            :sort-order="tableState?.sortOrder"
            :filters="filters"
            :global-filter-fields="globalFilterFields"
            :global-search-value="globalSearchValue"
            :columns="columns"
            :visible-columns="visibleColumns"
            :actions-header="actionsHeader"
            :selection-mode="selectionMode"
            :selected-rows="selectedRows"
            :expanded-rows="expandedRowsModel"
            :active-filter-count="activeFilterCount"
            @page="onPage"
            @sort="onSort"
            @filter="onFilter"
            @row-toggle="onRowToggle"
            @refresh="refreshData"
            @export="exportTable"
            @toggle-active-filters="toggleActiveFiltersPopover"
            @update:global-search-value="onGlobalSearchValueUpdate"
            @update:visible-columns="onVisibleColumnsUpdate"
            @update:selected-rows="onSelectedRowsUpdate"
            @update:expanded-rows="onExpandedRowsUpdate"
            @update:filters="onDesktopFiltersUpdate"
            @lookup-selection-meta="onLookupSelectionMetaPayload"
        >
            <template v-if="$slots['header-actions']" #header-actions>
                <slot name="header-actions"></slot>
            </template>
            <template v-if="$slots.actions" #actions="slotProps">
                <slot name="actions" v-bind="slotProps"></slot>
            </template>
            <template v-if="$slots.expansion" #expansion="slotProps">
                <slot name="expansion" v-bind="slotProps"></slot>
            </template>
            <template v-if="$slots.empty" #empty="slotProps">
                <slot name="empty" v-bind="slotProps"></slot>
            </template>
        </DataTableDesktop>

        <Popover v-if="!useMobilePresentation" ref="activeFiltersPopoverRef">
            <div class="w-[20rem] max-w-[calc(100vw-2rem)] p-1">
                <div class="mb-2 flex items-center justify-between">
                    <h4 class="text-sm font-semibold">{{ labels.activeFilters }}</h4>
                    <Button
                        v-if="activeFilterRows.length"
                        type="button"
                        :label="labels.clearAllFilters"
                        text
                        size="small"
                        severity="danger"
                        @click="clearFilters"
                    />
                </div>

                <div v-if="activeFilterRows.length" class="flex flex-col gap-2">
                    <div
                        v-for="row in activeFilterRows"
                        :key="row.key"
                        class="flex items-center justify-between gap-2 rounded-md border border-surface-200 px-2 py-1.5 dark:border-surface-700"
                    >
                        <div class="min-w-0 flex-1">
                            <div class="truncate text-xs text-surface-500">{{ row.label }}</div>
                            <div class="truncate text-sm font-medium">{{ row.value }}</div>
                        </div>
                        <Button
                            type="button"
                            icon="pi pi-times"
                            text
                            rounded
                            severity="danger"
                            size="small"
                            :aria-label="`${row.label} filtresini kaldır`"
                            @click="clearSingleFilterConstraint(row.field, row.constraintIndex)"
                        />
                    </div>
                </div>

                <div
                    v-else
                    class="rounded-md border border-dashed border-surface-300 px-3 py-4 text-center text-sm text-surface-500 dark:border-surface-700"
                >
                    {{ labels.noActiveFilters }}
                </div>
            </div>
        </Popover>
    </div>
</template>

<script setup lang="ts">
import type { LookupOption } from '@zyd-labs/primevue-lookup';
import { useMediaQuery } from '@vueuse/core';
import { Button, Popover } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { useDatatable } from '../composables/useDatatable';
import { useDatatableStore } from '../stores/datatable.store';
import type {
    ActiveFilterRow,
    ColumnDef,
    DataTableFilter,
    FilterConstraint,
    ResponsiveMode,
} from '../types/datatable';
import {
    buildFilterForColumn,
    getDefaultMatchMode,
    getFilterConfig,
    resolveFilterKey,
} from '../utils/columnFilters';
import {
    arraysEqual,
    readHiddenColumnState,
    resolveHiddenFromVisible,
    resolveVisibleColumnsFromHidden,
    writeHiddenColumnState,
    type ColumnVisibilityState,
} from '../utils/columnVisibility';
import {
    cleanFilters,
    countActiveFilterConstraints,
    formatFilterDisplayValue,
    isConstraintValueEmpty,
} from '../utils/filterPayload';
import { DATATABLE_LABELS } from '../utils/labels';
import DataTableDesktop from './internal/DataTableDesktop.vue';
import DataTableMobile from './internal/DataTableMobile.vue';

const props = withDefaults(defineProps<{
    tableKey: string;
    endpoint: string;
    columns: ColumnDef[];
    globalFilterFields?: string[];
    defaultSortField?: string;
    defaultSortOrder?: 1 | -1;
    defaultRows?: number;
    actionsHeader?: string;
    expandedRows?: Record<number | string, boolean>;
    selectionMode?: 'single' | 'multiple';
    responsiveMode?: ResponsiveMode;
    mobileBreakpoint?: number;
}>(), {
    defaultRows: 10,
    actionsHeader: DATATABLE_LABELS.actions,
    selectionMode: undefined,
    responsiveMode: 'table',
    mobileBreakpoint: 768,
});

const emit = defineEmits<{
    (e: 'row-toggle', data: unknown): void;
    (e: 'selection-change', rows: unknown[]): void;
    (e: 'filter-change', filters: Record<string, DataTableFilter>): void;
    (e: 'update:expandedRows', value: Record<number | string, boolean>): void;
}>();

const labels = DATATABLE_LABELS;
const store = useDatatableStore();
const toast = useToast();
const desktopRef = ref<InstanceType<typeof DataTableDesktop> | null>(null);
const activeFiltersPopoverRef = ref();
const exporting = ref(false);
const filters = ref<Record<string, DataTableFilter>>({});
const selectedRows = ref<unknown[]>([]);
const globalSearchValue = ref('');
const globalSearchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const expandedRowsFallback = ref<Record<number | string, boolean>>({});

const isMobileViewport = useMediaQuery(() => `(max-width: ${props.mobileBreakpoint}px)`);
const useMobilePresentation = computed(() => {
    return props.responsiveMode === 'adaptive' && isMobileViewport.value;
});

const storageKey = computed(() => `dt-columns-${props.tableKey}`);

let columnVisibilityState: ColumnVisibilityState | null = null;
let isSyncingVisibleColumns = false;

const visibleColumns = ref<string[]>(
    resolveVisibleColumnsFromHidden(props.columns, readHiddenColumnState(storageKey.value, props.columns)),
);

const expandedRowsModel = computed({
    get(): Record<number | string, boolean> {
        return props.expandedRows ?? expandedRowsFallback.value;
    },
    set(value: Record<number | string, boolean>) {
        if (props.expandedRows !== undefined) {
            emit('update:expandedRows', value);
        } else {
            expandedRowsFallback.value = value;
        }
    },
});

const tableState = computed(() => {
    const state = store.tables[props.tableKey];
    if (!state) {
        return state;
    }

    if (state.sortOrder !== undefined && typeof state.sortOrder === 'string') {
        const sortOrderNum = Number(state.sortOrder);
        return {
            ...state,
            sortOrder: sortOrderNum === 0 ? undefined : (sortOrderNum as 1 | -1),
        };
    }

    const sortOrderValue = state.sortOrder as unknown;
    if (typeof sortOrderValue === 'number' && sortOrderValue === 0) {
        return {
            ...state,
            sortOrder: undefined,
        };
    }

    return state;
});

const mobileRows = computed(() => {
    return (tableState.value?.data ?? []) as Record<string, unknown>[];
});

const activeFilterRows = computed<ActiveFilterRow[]>(() => {
    const rows: ActiveFilterRow[] = [];
    const fieldLabelMap = new Map(props.columns.map((column) => [resolveFilterKey(column), column.header]));

    Object.entries(filters.value).forEach(([field, filter]) => {
        if (!filter?.constraints?.length) {
            return;
        }

        const label = fieldLabelMap.get(field) ?? field;

        filter.constraints.forEach((constraint, index) => {
            if (isConstraintValueEmpty(constraint.value)) {
                return;
            }

            rows.push({
                key: `${field}-${index}`,
                field,
                label,
                value: formatFilterDisplayValue(constraint as FilterConstraint),
                constraintIndex: index,
            });
        });
    });

    return rows;
});

const activeFilterCount = computed(() => countActiveFilterConstraints(filters.value));

const { fetchData: apiFetch, exportData: apiExport } = useDatatable(props.endpoint);

watch(
    selectedRows,
    (rows) => {
        emit('selection-change', rows);
    },
    { deep: true },
);

watch(
    () => tableState.value?.globalFilter,
    (newGlobalFilter) => {
        if (!tableState.value) {
            return;
        }

        if (newGlobalFilter === undefined || newGlobalFilter === null) {
            globalSearchValue.value = '';
        } else if (globalSearchValue.value !== newGlobalFilter) {
            globalSearchValue.value = newGlobalFilter;
        }
    },
);

const initFilters = (): Record<string, DataTableFilter> => {
    const filterObj: Record<string, DataTableFilter> = {};
    props.columns.forEach((col) => {
        if (col.filter !== false) {
            filterObj[resolveFilterKey(col)] = buildFilterForColumn(col);
        }
    });
    filters.value = filterObj;
    return filterObj;
};

const syncFilterStateWithColumns = (columns: ColumnDef[]) => {
    const nextFilters = { ...filters.value };
    const allowedKeys = new Set<string>();

    columns.forEach((col) => {
        if (col.filter !== false) {
            const filterKey = resolveFilterKey(col);
            allowedKeys.add(filterKey);
            if (!Object.prototype.hasOwnProperty.call(nextFilters, filterKey)) {
                nextFilters[filterKey] = buildFilterForColumn(col);
            }
        }
    });

    Object.keys(nextFilters).forEach((field) => {
        if (field === 'global') {
            return;
        }

        if (!allowedKeys.has(field)) {
            delete nextFilters[field];
        }
    });

    filters.value = nextFilters;
    if (tableState.value) {
        store.patch(props.tableKey, { filters: nextFilters });
    }
};

const fetchData = async () => {
    if (!tableState.value) {
        return;
    }

    store.patch(props.tableKey, { loading: true });

    try {
        const cleanedFilters = cleanFilters(tableState.value.filters);

        const params: Record<string, unknown> = {
            first: tableState.value.first,
            rows: tableState.value.rows,
            filters: cleanedFilters,
            global: tableState.value.globalFilter,
        };

        const sortOrder = tableState.value.sortOrder;
        if (tableState.value.sortField && sortOrder !== undefined && (sortOrder === 1 || sortOrder === -1)) {
            params.sortField = tableState.value.sortField;
            params.sortOrder = sortOrder;
        }

        const result = await apiFetch(params);
        store.patch(props.tableKey, {
            data: result.data,
            total: result.total,
            loading: false,
        });
    } catch (error: unknown) {
        store.patch(props.tableKey, { loading: false });
        const message = error instanceof Error ? error.message : 'Veri yüklenemedi';
        toast.add({
            severity: 'error',
            summary: 'Hata',
            detail: message,
            life: 3000,
        });
    }
};

const onPage = (event: { first: number; rows: number }) => {
    store.patch(props.tableKey, { first: event.first, rows: event.rows });
    fetchData();
};

const onSort = (event: { sortField?: string; sortOrder?: number | string | null }) => {
    const sortOrder = Number(event.sortOrder);
    if (sortOrder === 0 || Number.isNaN(sortOrder)) {
        store.patch(props.tableKey, {
            sortField: undefined,
            sortOrder: undefined,
        });
    } else {
        store.patch(props.tableKey, {
            sortField: event.sortField as string,
            sortOrder: sortOrder as 1 | -1,
        });
    }
    fetchData();
};

const onMobileSort = (payload: { sortField?: string; sortOrder?: 1 | -1 }) => {
    store.patch(props.tableKey, {
        sortField: payload.sortField,
        sortOrder: payload.sortOrder,
        first: 0,
    });
    fetchData();
};

const applyFilterChange = (nextFilters: Record<string, DataTableFilter>) => {
    const currentFilters = (tableState.value?.filters ?? {}) as Record<string, DataTableFilter>;

    filters.value = nextFilters;
    store.patch(props.tableKey, { filters: nextFilters, first: 0 });
    emit('filter-change', nextFilters);

    const nextCleanedFilters = cleanFilters(nextFilters);
    const currentCleanedFilters = cleanFilters(currentFilters);

    if (JSON.stringify(nextCleanedFilters) === JSON.stringify(currentCleanedFilters)) {
        return;
    }

    fetchData();
};

const onFilter = (event: { filters: Record<string, DataTableFilter> }) => {
    applyFilterChange(event.filters);
};

const onMobileFiltersUpdate = (nextFilters: Record<string, DataTableFilter>) => {
    applyFilterChange(nextFilters);
};

const onDesktopFiltersUpdate = (nextFilters: Record<string, DataTableFilter>) => {
    filters.value = nextFilters;
};

const onClearFilterConstraint = (payload: { field: string; constraintIndex: number }) => {
    clearSingleFilterConstraint(payload.field, payload.constraintIndex);
};

const preserveFilterOverlayOnPrimeOverlayInteraction = (event: Event): void => {
    if (useMobilePresentation.value) {
        return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
        return;
    }

    const isPrimeOverlayInteraction = Boolean(
        target.closest('[data-pc-section="overlay"], [data-pc-section="panel"]'),
    );
    if (!isPrimeOverlayInteraction) {
        return;
    }

    const tableElement = (desktopRef.value as { dataTableRef?: { $el?: HTMLElement } } | null)
        ?.dataTableRef?.$el;
    const filterOverlay = tableElement?.querySelector<HTMLElement>('.p-datatable-filter-overlay');
    if (!filterOverlay) {
        return;
    }

    filterOverlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    filterOverlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

watch(
    () => props.columns,
    (newColumns) => {
        const hidden = columnVisibilityState?.hidden ?? readHiddenColumnState(storageKey.value, newColumns);
        const nextVisible = resolveVisibleColumnsFromHidden(newColumns, hidden);

        if (!arraysEqual(nextVisible, visibleColumns.value)) {
            isSyncingVisibleColumns = true;
            visibleColumns.value = nextVisible;
            isSyncingVisibleColumns = false;
        }

        columnVisibilityState = writeHiddenColumnState(storageKey.value, hidden, columnVisibilityState);
        syncFilterStateWithColumns(newColumns);
    },
    { deep: true },
);

watch(visibleColumns, (newVal) => {
    if (isSyncingVisibleColumns) {
        return;
    }

    const hidden = resolveHiddenFromVisible(props.columns, newVal);
    columnVisibilityState = writeHiddenColumnState(storageKey.value, hidden, columnVisibilityState);
}, { deep: true });

onMounted(() => {
    document.addEventListener('mousedown', preserveFilterOverlayOnPrimeOverlayInteraction, true);
    document.addEventListener('click', preserveFilterOverlayOnPrimeOverlayInteraction, true);

    const initialFilters = initFilters();

    store.init(props.tableKey, {
        rows: props.defaultRows,
        sortField: props.defaultSortField,
        sortOrder: props.defaultSortOrder !== undefined ? (Number(props.defaultSortOrder) as 1 | -1) : undefined,
        filters: initialFilters,
    });

    const hidden = readHiddenColumnState(storageKey.value, props.columns);
    columnVisibilityState = { hidden, version: 2 };
    columnVisibilityState = writeHiddenColumnState(storageKey.value, hidden, columnVisibilityState);

    const nextVisible = resolveVisibleColumnsFromHidden(props.columns, hidden);

    if (!arraysEqual(nextVisible, visibleColumns.value)) {
        isSyncingVisibleColumns = true;
        visibleColumns.value = nextVisible;
        isSyncingVisibleColumns = false;
    }

    fetchData();
});

onUnmounted(() => {
    document.removeEventListener('mousedown', preserveFilterOverlayOnPrimeOverlayInteraction, true);
    document.removeEventListener('click', preserveFilterOverlayOnPrimeOverlayInteraction, true);

    if (globalSearchDebounceTimer.value) {
        clearTimeout(globalSearchDebounceTimer.value);
    }
});

const refreshData = () => {
    fetchData();
};

const onGlobalSearchValueUpdate = (value: string): void => {
    globalSearchValue.value = value;
    onGlobalSearchChange();
};

const onGlobalSearchChange = (): void => {
    if (globalSearchDebounceTimer.value) {
        clearTimeout(globalSearchDebounceTimer.value);
    }

    globalSearchDebounceTimer.value = setTimeout(() => {
        if (!tableState.value) {
            return;
        }

        store.patch(props.tableKey, {
            globalFilter: globalSearchValue.value || undefined,
            first: 0,
        });
        fetchData();
    }, 400);
};

provide('refreshTable', refreshData);

const clearFilters = () => {
    const clearedFilters: Record<string, DataTableFilter> = {};
    props.columns.forEach((col) => {
        if (col.filter !== false) {
            const filterConfig = getFilterConfig(col);
            const filterKey = resolveFilterKey(col);

            if (col.defaultFilter) {
                clearedFilters[filterKey] = col.defaultFilter as DataTableFilter;
            } else if (filterConfig?.constraints?.length) {
                clearedFilters[filterKey] = {
                    operator: filterConfig.operator || 'and',
                    constraints: filterConfig.constraints,
                } as DataTableFilter;
            } else {
                clearedFilters[filterKey] = {
                    operator: filterConfig?.operator || 'and',
                    constraints: [
                        {
                            value: null,
                            matchMode: getDefaultMatchMode(col, filterConfig),
                        },
                    ],
                };
            }
        }
    });

    filters.value = clearedFilters;
    store.patch(props.tableKey, {
        filters: clearedFilters,
        globalFilter: undefined,
        first: 0,
    });
    emit('filter-change', clearedFilters);
    fetchData();
};

const clearSingleFilter = (field: string): void => {
    const nextFilters = { ...filters.value };
    const column = props.columns.find((col) => resolveFilterKey(col) === field);
    const filterConfig = column ? getFilterConfig(column) : null;

    if (column?.defaultFilter) {
        nextFilters[field] = column.defaultFilter as DataTableFilter;
    } else {
        nextFilters[field] = {
            operator: filterConfig?.operator || 'and',
            constraints: [{
                value: null,
                matchMode: getDefaultMatchMode(column ?? { field: '', header: '' }, filterConfig),
            }],
        };
    }

    applyFilterChange(nextFilters);
};

const clearSingleFilterConstraint = (field: string, constraintIndex: number): void => {
    const current = filters.value[field];
    if (!current?.constraints?.length) {
        clearSingleFilter(field);
        return;
    }

    const nextConstraints = current.constraints
        .filter((_, index) => index !== constraintIndex)
        .filter((constraint) => !isConstraintValueEmpty(constraint.value));

    if (nextConstraints.length === 0) {
        clearSingleFilter(field);
        return;
    }

    applyFilterChange({
        ...filters.value,
        [field]: {
            operator: current.operator ?? 'and',
            constraints: nextConstraints,
        },
    });
};

const resolveLookupDisplayLabel = (column: ColumnDef, option: LookupOption): string => {
    const filterConfig = getFilterConfig(column);
    const labelKey = filterConfig?.lookupOptionLabel;
    if (!labelKey || labelKey === 'label') {
        return option.label;
    }

    const metaValue = option.meta?.[labelKey];
    if (metaValue !== undefined && metaValue !== null) {
        return String(metaValue);
    }

    return option.label;
};

const onLookupSelectionMetaPayload = (payload: {
    column: ColumnDef;
    filterModel: { value: unknown; displayValue?: string | string[] | null };
    options: LookupOption[];
}): void => {
    const isMultiple = Array.isArray(payload.filterModel.value);
    const resolvedLabels = payload.options.map((option) => resolveLookupDisplayLabel(payload.column, option));

    if (isMultiple) {
        payload.filterModel.displayValue = resolvedLabels;
        return;
    }

    payload.filterModel.displayValue = resolvedLabels[0] ?? null;
};

const toggleActiveFiltersPopover = (event: Event): void => {
    activeFiltersPopoverRef.value?.toggle(event);
};

const onRowToggle = (data: unknown) => {
    emit('row-toggle', data);
};

const resolveRowKey = (row: Record<string, unknown>): string | number => {
    const id = row.id;
    if (typeof id === 'string' || typeof id === 'number') {
        return id;
    }

    return JSON.stringify(row);
};

const onMobileToggleSelection = (row: Record<string, unknown>): void => {
    const key = resolveRowKey(row);

    if (props.selectionMode === 'single') {
        const alreadySelected = selectedRows.value.some((selected) => {
            if (!selected || typeof selected !== 'object') {
                return false;
            }
            return resolveRowKey(selected as Record<string, unknown>) === key;
        });

        selectedRows.value = alreadySelected ? [] : [row];
        return;
    }

    if (props.selectionMode === 'multiple') {
        const exists = selectedRows.value.some((selected) => {
            if (!selected || typeof selected !== 'object') {
                return false;
            }
            return resolveRowKey(selected as Record<string, unknown>) === key;
        });

        if (exists) {
            selectedRows.value = selectedRows.value.filter((selected) => {
                if (!selected || typeof selected !== 'object') {
                    return true;
                }
                return resolveRowKey(selected as Record<string, unknown>) !== key;
            });
        } else {
            selectedRows.value = [...selectedRows.value, row];
        }
    }
};

const onMobileToggleExpand = (row: Record<string, unknown>): void => {
    const key = resolveRowKey(row);
    const next = { ...expandedRowsModel.value };

    if (next[key]) {
        delete next[key];
    } else {
        next[key] = true;
    }

    expandedRowsModel.value = next;
    emit('row-toggle', { data: row, originalEvent: null });
};

const onVisibleColumnsUpdate = (value: string[]): void => {
    visibleColumns.value = value;
};

const onSelectedRowsUpdate = (value: unknown[]): void => {
    selectedRows.value = value;
};

const onExpandedRowsUpdate = (value: Record<number | string, boolean>): void => {
    expandedRowsModel.value = value;
};

const exportTable = async () => {
    if (!tableState.value) {
        return;
    }

    exporting.value = true;

    try {
        const cleanedFilters = cleanFilters(tableState.value.filters);

        const params: Record<string, unknown> = {
            first: tableState.value.first,
            rows: tableState.value.rows,
            filters: cleanedFilters,
            global: tableState.value.globalFilter,
            export: 1,
        };

        const sortOrder = tableState.value.sortOrder;
        if (tableState.value.sortField && sortOrder !== undefined && (sortOrder === 1 || sortOrder === -1)) {
            params.sortField = tableState.value.sortField;
            params.sortOrder = sortOrder;
        }

        const response = await apiExport(params);

        const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
        const dispositionHeader = response.headers?.['content-disposition'];
        const disposition = Array.isArray(dispositionHeader)
            ? dispositionHeader[0] || ''
            : (dispositionHeader as string | undefined) || '';
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const fileName = match ? decodeURIComponent(match[1]) : 'export.xlsx';

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Excel dosyası indiriliyor.',
            life: 3000,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Excel oluşturulurken hata oluştu';
        toast.add({
            severity: 'error',
            summary: 'Export Hatası',
            detail: message,
            life: 4000,
        });
    } finally {
        exporting.value = false;
    }
};

const getSelectedRows = () => {
    return selectedRows.value;
};

const clearSelection = (): void => {
    selectedRows.value = [];
    emit('selection-change', []);
};

defineExpose({
    refreshData,
    clearFilters,
    exportTable,
    getSelectedRows,
    clearSelection,
});
</script>
