<template>
    <DataTable ref="dataTableRef" :value="tableState?.data" :lazy="true" :paginator="true" :rows="tableState?.rows"
        :totalRecords="tableState?.total" :loading="tableState?.loading" :first="tableState?.first"
        :sortField="tableState?.sortField" :sortOrder="tableState?.sortOrder" v-model:filters="filters"
        filterDisplay="menu" :globalFilterFields="globalFilterFields" removableSort @page="onPage" @sort="onSort"
        @filter="onFilter" dataKey="id" :rowsPerPageOptions="[10, 25, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        size="small" class="responsive-datatable" showGridlines v-model:expandedRows="expandedRowsModel" @row-toggle="onRowToggle"
        v-model:selection="selectedRows" :selectionMode="selectionMode">
        <template #header>
            <div class="flex flex-col gap-4">
                <div v-if="$slots['header-actions']" class="flex flex-wrap gap-2">
                    <slot name="header-actions"></slot>
                </div>

                <div class="flex flex-row flex-wrap items-center gap-3">
                    <InputText v-model="globalSearchValue" type="text" placeholder="Genel ara..." size="small"
                        @input="onGlobalSearchChange" class="w-full sm:w-[15rem] md:flex-1" />

                    <div class="flex items-center gap-2 shrink-0">
                        <Button icon="pi pi-sync" severity="secondary" size="small" @click="refreshData"
                            v-tooltip="'Yenile'" />
                        <Button type="button" icon="pi pi-filter-slash" severity="secondary" size="small"
                            @click="toggleActiveFiltersPopover" v-tooltip="'Filtreleri temizle'" />
                        <Button icon="pi pi-file-excel" severity="success" size="small" :loading="exporting"
                            :disabled="exporting || tableState?.loading" @click="exportTable"
                            v-tooltip="'Excel olarak indir'" />
                    </div>

                    <MultiSelect v-model="visibleColumns" :options="columns" optionLabel="header" optionValue="field"
                        placeholder="Sütunları Seç" display="chip" :maxSelectedLabels="2" size="small"
                        class="min-w-[10rem] max-w-[14rem] shrink-0" />
                </div>
            </div>
        </template>

        <template #empty>
            <div class="text-center py-8">
                <i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-500">Kayıt bulunamadı</p>
            </div>
        </template>

        <template #loading>
            <Skeleton height="3rem" class="mb-2" v-for="i in 5" :key="i" />
        </template>

        <Column v-if="selectionMode" :selectionMode="selectionMode" :exportable="false" headerStyle="width: 3rem"
            style="width: 3rem" />
        <Column v-if="$slots.expansion" :exportable="false" :expander="true" headerStyle="width: 3rem" />
        <Column v-for="col in visibleColumnsData" :key="col.field" :field="col.field"
            :filterField="col.filterField ?? col.field" :header="col.header" :sortable="col.sortable !== false"
            :dataType="resolveColumnDataType(col)"
            :showFilterMatchModes="col.filter === false ? false : !(getFilterConfig(col)?.showMatchModes === false)"
            :showFilterOperator="col.filter === false ? false : !(getFilterConfig(col)?.showOperator === false)">
            <template #body="slotProps" v-if="col.render">
                <component v-if="isComponent(col.render)" :is="col.render" :data="slotProps.data" />
                <template v-else-if="typeof col.render === 'function'">
                    <RenderCell :render-result="(col.render as Function)(slotProps.data)" />
                </template>
            </template>

            <template #filter="{ filterModel }" v-if="col.filter !== false">
                <MultiSelect v-if="resolveFilterType(col) === 'multi-select'" v-model="filterModel.value"
                    :options="getFilterOptions(col)" :optionLabel="getFilterOptionLabel(col)"
                    :optionValue="getFilterOptionValue(col)"
                    :maxSelectedLabels="getFilterConfig(col)?.maxSelectedLabels ?? 3" filter
                    :placeholder="resolveFilterPlaceholder(col)" size="small" class="w-full" />

                <LookupSelect
                    v-else-if="resolveFilterType(col) === 'lookup' || resolveFilterType(col) === 'lookup-multiple'"
                    v-model="filterModel.value" :endpoint="getFilterConfig(col)?.lookupEndpoint ?? ''"
                    :multiple="resolveFilterType(col) === 'lookup-multiple'"
                    :filters="getFilterConfig(col)?.lookupParams" :placeholder="resolveFilterPlaceholder(col)"
                    :disabled="!getFilterConfig(col)?.lookupEndpoint"
                    @selection-meta="(options: LookupOption[]) => onLookupSelectionMeta(col, filterModel, options)"
                    class="w-full" />

                <Select v-else-if="resolveFilterType(col) === 'select' || resolveFilterType(col) === 'boolean'"
                    v-model="filterModel.value" :options="resolveSelectOptions(col)"
                    :optionLabel="getFilterOptionLabel(col)" :optionValue="getFilterOptionValue(col)"
                    :placeholder="resolveFilterPlaceholder(col)" size="small" class="w-full" />

                <DatePicker v-else-if="resolveFilterType(col) === 'date-range'" v-model="filterModel.value"
                    selectionMode="range" dateFormat="dd/mm/yy" :placeholder="resolveFilterPlaceholder(col)"
                    size="small" class="w-full" />

                <DatePicker v-else-if="resolveFilterType(col) === 'date'" v-model="filterModel.value"
                    dateFormat="dd/mm/yy" :placeholder="resolveFilterPlaceholder(col)" size="small" class="w-full" />

                <InputNumber v-else-if="col.dataType === 'numeric'" v-model="filterModel.value"
                    :placeholder="resolveFilterPlaceholder(col, 'Değer')" size="small" class="w-full" />

                <InputText v-else v-model="filterModel.value" type="text"
                    :placeholder="resolveFilterPlaceholder(col, 'Ara...')" size="small" class="w-full" />
            </template>
        </Column>

        <Column v-if="$slots.actions" :exportable="false" :header="actionsHeader">
            <template #body="slotProps">
                <div class="flex gap-2 justify-start items-center ">
                    <slot name="actions" :data="slotProps.data"></slot>
                </div>
            </template>
        </Column>

        <template #paginatorstart>
            <div class="flex items-center gap-2 text-sm text-gray-600">
                <i class="fas fa-info-circle"></i>
                <span>Toplam: <strong>{{ tableState?.total || 0 }}</strong> kayıt</span>
            </div>
        </template>

        <template v-if="$slots.expansion" #expansion="{ data }">
            <slot name="expansion" :data="data"></slot>
        </template>
    </DataTable>

    <Popover ref="activeFiltersPopoverRef">
        <div class="w-[20rem] max-w-[calc(100vw-2rem)] p-1">
            <div class="mb-2 flex items-center justify-between">
                <h4 class="text-sm font-semibold">Aktif Filtreler</h4>
                <Button v-if="activeFilterRows.length" type="button" label="Tümünü temizle" text size="small"
                    severity="danger" @click="clearFilters" />
            </div>

            <div v-if="activeFilterRows.length" class="flex flex-col gap-2">
                <div v-for="row in activeFilterRows" :key="row.key"
                    class="flex items-center justify-between gap-2 rounded-md border border-surface-200 px-2 py-1.5 dark:border-surface-700">
                    <div class="min-w-0 flex-1">
                        <div class="truncate text-xs text-surface-500">{{ row.label }}</div>
                        <div class="truncate text-sm font-medium">{{ row.value }}</div>
                    </div>
                    <Button type="button" icon="pi pi-times" text rounded severity="danger" size="small"
                        :aria-label="`${row.label} filtresini kaldır`"
                        @click="clearSingleFilterConstraint(row.field, row.constraintIndex)" />
                </div>
            </div>

            <div v-else
                class="rounded-md border border-dashed border-surface-300 px-3 py-4 text-center text-sm text-surface-500 dark:border-surface-700">
                Aktif filtre bulunmuyor.
            </div>
        </div>
    </Popover>
</template>

<script setup lang="ts">
import type { LookupOption } from '@zyd-labs/primevue-lookup';
import { LookupSelect } from '@zyd-labs/primevue-lookup';
import type { ColumnDef, ColumnFilterConfig, DataTableFilter, FilterConstraint } from '../types/datatable';
import { useDatatable } from '../composables/useDatatable';
import { useDatatableStore } from '../stores/datatable.store';
import { FilterMatchMode } from '@primevue/core/api';
import {
    Button,
    Column,
    DataTable,
    DatePicker,
    InputNumber,
    InputText,
    MultiSelect,
    Popover,
    Select,
    Skeleton,
} from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, defineComponent, h, onMounted, onUnmounted, provide, ref, watch, type VNode } from 'vue';

const props = withDefaults(defineProps<{
    tableKey: string;
    endpoint: string;
    columns: ColumnDef[];
    globalFilterFields?: string[];
    defaultSortField?: string;
    defaultSortOrder?: 1 | -1;
    defaultRows?: number;
    actionsHeader?: string;
    expandedRows?: Record<number, boolean>;
    selectionMode?: 'single' | 'multiple';
}>(), {
    defaultRows: 10,
    actionsHeader: 'İşlemler',
    selectionMode: undefined,
});

const emit = defineEmits<{
    (e: 'row-toggle', data: unknown): void;
    (e: 'selection-change', rows: unknown[]): void;
    (e: 'filter-change', filters: Record<string, DataTableFilter>): void;
    (e: 'update:expandedRows', value: Record<number, boolean>): void;
}>();

const expandedRowsFallback = ref<Record<number, boolean>>({});

const expandedRowsModel = computed({
    get(): Record<number, boolean> {
        return props.expandedRows ?? expandedRowsFallback.value;
    },
    set(value: Record<number, boolean>) {
        if (props.expandedRows !== undefined) {
            emit('update:expandedRows', value);
        } else {
            expandedRowsFallback.value = value;
        }
    },
});

const store = useDatatableStore();
const toast = useToast();
const storageKey = computed(() => `dt-columns-${props.tableKey}`);

type ColumnVisibilityState = {
    hidden: string[];
    version: 2;
};

const allColumnFieldsFromColumns = (columns: ColumnDef[]): string[] => {
    return columns.map((column) => column.field);
};

const defaultVisibleColumnFields = (columns: ColumnDef[]): string[] => {
    return columns.filter((column) => column.visible !== false).map((column) => column.field);
};

const currentColumnFields = (): string[] => allColumnFieldsFromColumns(props.columns);

const resolveVisibleColumnsFromHidden = (columns: ColumnDef[], hidden: string[]): string[] => {
    const hiddenSet = new Set(hidden);
    return defaultVisibleColumnFields(columns).filter((field) => !hiddenSet.has(field));
};

const resolveHiddenFromVisible = (columns: ColumnDef[], visible: string[]): string[] => {
    const visibleSet = new Set(visible);
    return defaultVisibleColumnFields(columns).filter((field) => !visibleSet.has(field));
};

const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((value, index) => value === b[index]);
};

const migrateOldVisibilityFormat = (raw: unknown, columns: ColumnDef[]): string[] => {
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

let columnVisibilityState: ColumnVisibilityState | null = null;
let isSyncingVisibleColumns = false;

const readHiddenColumnState = (): string[] => {
    try {
        const rawValue = localStorage.getItem(storageKey.value);
        if (!rawValue) {
            return [];
        }

        const parsed = JSON.parse(rawValue);

        if (typeof parsed === 'object' && parsed !== null && parsed.version === 2 && Array.isArray(parsed.hidden)) {
            return parsed.hidden.filter((item): item is string => typeof item === 'string');
        }

        return migrateOldVisibilityFormat(parsed, props.columns);
    } catch (error) {
        console.warn('localStorage okuma hatası:', error);
        return [];
    }
};

const writeHiddenColumnState = (hidden: string[]) => {
    const currentDefaultVisible = defaultVisibleColumnFields(props.columns);
    const currentFieldSet = new Set(currentDefaultVisible);
    const filteredHidden = hidden.filter((field) => currentFieldSet.has(field));

    const nextState: ColumnVisibilityState = {
        hidden: filteredHidden,
        version: 2,
    };

    if (columnVisibilityState && arraysEqual(columnVisibilityState.hidden, nextState.hidden)) {
        columnVisibilityState = nextState;
        return;
    }

    try {
        localStorage.setItem(storageKey.value, JSON.stringify(nextState));
    } catch (error) {
        console.warn('localStorage yazma hatası:', error);
    }

    columnVisibilityState = nextState;
};



const visibleColumns = ref<string[]>(resolveVisibleColumnsFromHidden(props.columns, readHiddenColumnState()));
const filters = ref<Record<string, any>>({});
const selectedRows = ref<unknown[]>([]);
const activeFiltersPopoverRef = ref();
const dataTableRef = ref<InstanceType<typeof DataTable> | null>(null);
const globalSearchValue = ref<string>('');
const globalSearchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);

watch(
    selectedRows,
    (rows) => {
        emit('selection-change', rows);
    },
    { deep: true },
);

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

const visibleColumnsData = computed(() => props.columns.filter((col) => visibleColumns.value.includes(col.field)));

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

const { fetchData: apiFetch, exportData: apiExport } = useDatatable(props.endpoint);

const getFilterConfig = (column: ColumnDef): ColumnFilterConfig | null => {
    return typeof column.filter === 'object' ? column.filter : null;
};

const resolveFilterKey = (column: ColumnDef): string => {
    return column.filterField ?? column.field;
};

const resolveFilterType = (column: ColumnDef): NonNullable<ColumnFilterConfig['filterType']> => {
    const filterConfig = getFilterConfig(column);
    if (filterConfig?.filterType) {
        return filterConfig.filterType;
    }

    if (column.dataType === 'boolean') {
        return 'boolean';
    }

    if (column.dataType === 'date') {
        return 'date';
    }

    return 'text';
};

const getFilterOptions = (column: ColumnDef) => {
    return getFilterConfig(column)?.filterOptions ?? [];
};

const getFilterOptionLabel = (column: ColumnDef): string => {
    return getFilterConfig(column)?.filterOptionLabel ?? 'label';
};

const getFilterOptionValue = (column: ColumnDef): string => {
    return getFilterConfig(column)?.filterOptionValue ?? 'value';
};

const resolveFilterPlaceholder = (column: ColumnDef, fallback = 'Seçiniz'): string => {
    const filterConfig = getFilterConfig(column);

    return filterConfig?.filterPlaceholder ?? filterConfig?.placeholder ?? fallback;
};

const resolveSelectOptions = (column: ColumnDef) => {
    if (resolveFilterType(column) === 'boolean' && !getFilterConfig(column)?.filterOptions?.length) {
        return [{ label: 'Evet', value: 1 }, { label: 'Hayır', value: 0 }];
    }

    return getFilterOptions(column);
};

const resolveColumnDataType = (column: ColumnDef): string => {
    const filterType = resolveFilterType(column);
    if (filterType === 'date-range' || filterType === 'date') {
        return 'date';
    }

    return column.dataType || 'text';
};

const buildFilterForColumn = (column: ColumnDef): DataTableFilter => {
    const filterConfig = getFilterConfig(column);
    if (column.defaultFilter) {
        return column.defaultFilter as DataTableFilter;
    }

    return {
        operator: filterConfig?.operator || 'and',
        constraints: [
            {
                value: null,
                matchMode: getDefaultMatchMode(column, filterConfig),
            },
        ],
    } as DataTableFilter;
};

const initFilters = (): Record<string, DataTableFilter> => {
    const filterObj: Record<string, DataTableFilter> = {};
    props.columns.forEach((col) => {
        if (col.filter !== false) {
            filterObj[resolveFilterKey(col)] = buildFilterForColumn(col);
        }
    });
    filters.value = filterObj as any;
    return filterObj;
};

const syncFilterStateWithColumns = (columns: ColumnDef[]) => {
    const nextFilters = { ...(filters.value as Record<string, DataTableFilter>) };
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

    filters.value = nextFilters as any;
    if (tableState.value) {
        store.patch(props.tableKey, { filters: nextFilters });
    }
};

const getDefaultMatchMode = (column: ColumnDef, filter?: ColumnFilterConfig | null) => {
    if (filter?.filterMatchMode) {
        return filter.filterMatchMode;
    }

    switch (resolveFilterType(column)) {
        case 'lookup':
        case 'select':
        case 'boolean':
            return FilterMatchMode.EQUALS;
        case 'lookup-multiple':
        case 'multi-select':
            return FilterMatchMode.IN;
        case 'date-range':
            return FilterMatchMode.BETWEEN;
        case 'date':
            return FilterMatchMode.DATE_IS;
        default:
            return FilterMatchMode.CONTAINS;
    }
};

const isComponent = (value: unknown): boolean => {
    return Boolean(value && typeof value === 'object' && ('template' in (value as Record<string, unknown>) || 'render' in (value as Record<string, unknown>) || 'setup' in (value as Record<string, unknown>)));
};

const isVNode = (value: unknown): value is VNode => {
    return Boolean(value && typeof value === 'object' && '__v_isVNode' in (value as Record<string, unknown>));
};

const RenderCell = defineComponent({
    props: {
        renderResult: {
            type: [Object, String, Number] as unknown as () => VNode | string | number,
            required: true,
        },
    },
    setup(props: { renderResult: VNode | string | number }) {
        return () => {
            if (isVNode(props.renderResult)) {
                return props.renderResult;
            }

            const content = typeof props.renderResult === 'number'
                ? String(props.renderResult)
                : (props.renderResult as string);

            return h('div', {
                innerHTML: content,
                class: 'render-content',
            });
        };
    },
});

const isConstraintValueEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === 'string') {
        return value.trim() === '';
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    return false;
};

const formatDateValue = (value: unknown): unknown => {
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    if (typeof value === 'string' && value.includes('T')) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return formatDateValue(date);
        }
    }

    if (Array.isArray(value)) {
        return value.map((item) => formatDateValue(item));
    }

    return value;
};

const normalizePayloadConstraint = (constraint: FilterConstraint): FilterConstraint => {
    return {
        value: formatDateValue(constraint.value),
        matchMode: constraint.matchMode,
    };
};

const cleanFilters = (rawFilters: Record<string, DataTableFilter>) => {
    const cleaned: Record<string, DataTableFilter> = {};

    Object.keys(rawFilters).forEach((field) => {
        if (field === 'global') {
            return;
        }

        const filter = rawFilters[field];
        if (!filter || !filter.constraints) {
            return;
        }

        const validConstraints = filter.constraints.filter((constraint: any) => !isConstraintValueEmpty(constraint.value));

        if (validConstraints.length > 0) {
            cleaned[field] = {
                operator: filter.operator,
                constraints: validConstraints.map((constraint) => normalizePayloadConstraint(constraint as FilterConstraint)),
            };
        }
    });

    return cleaned;
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
    } catch (error: any) {
        store.patch(props.tableKey, { loading: false });
        toast.add({
            severity: 'error',
            summary: 'Hata',
            detail: error?.message || 'Veri yüklenemedi',
            life: 3000,
        });
    }
};

const onPage = (event: any) => {
    store.patch(props.tableKey, { first: event.first, rows: event.rows });
    fetchData();
};

const onSort = (event: any) => {
    const sortOrder = Number(event.sortOrder);
    if (sortOrder === 0) {
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

const onFilter = (event: any) => {
    const nextFilters = event.filters as Record<string, DataTableFilter>;
    const currentFilters = (tableState.value?.filters ?? {}) as Record<string, DataTableFilter>;

    store.patch(props.tableKey, { filters: nextFilters, first: 0 });
    emit('filter-change', nextFilters);

    const nextCleanedFilters = cleanFilters(nextFilters);
    const currentCleanedFilters = cleanFilters(currentFilters);

    if (JSON.stringify(nextCleanedFilters) === JSON.stringify(currentCleanedFilters)) {
        return;
    }

    fetchData();
};

const preserveFilterOverlayOnPrimeOverlayInteraction = (event: Event): void => {
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

    const tableElement = (dataTableRef.value as any)?.$el as HTMLElement | undefined;
    const filterOverlay = tableElement?.querySelector<HTMLElement>('.p-datatable-filter-overlay');
    if (!filterOverlay) {
        return;
    }

    // Mark as self interaction before PrimeVue outside-click handler runs.
    filterOverlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    filterOverlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

watch(
    () => props.columns,
    (newColumns) => {
        const hidden = columnVisibilityState?.hidden ?? readHiddenColumnState();
        const nextVisible = resolveVisibleColumnsFromHidden(newColumns, hidden);

        if (!arraysEqual(nextVisible, visibleColumns.value)) {
            isSyncingVisibleColumns = true;
            visibleColumns.value = nextVisible;
            isSyncingVisibleColumns = false;
        }

        syncFilterStateWithColumns(newColumns);
    },
    { deep: true },
);

watch(visibleColumns, (newVal) => {
    if (isSyncingVisibleColumns) {
        return;
    }

    const hidden = resolveHiddenFromVisible(props.columns, newVal);
    writeHiddenColumnState(hidden);
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

    const hidden = readHiddenColumnState();
    columnVisibilityState = { hidden, version: 2 };
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

const onGlobalSearchChange = (): void => {
    // Clear existing debounce timer
    if (globalSearchDebounceTimer.value) {
        clearTimeout(globalSearchDebounceTimer.value);
    }

    // Set new debounce timer (400ms)
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
                } as DataTableFilter;
            }
        }
    });

    filters.value = clearedFilters as any;
    store.patch(props.tableKey, {
        filters: clearedFilters,
        globalFilter: undefined,
        first: 0,
    });
    emit('filter-change', clearedFilters);
    fetchData();
};

const clearSingleFilter = (field: string): void => {
    const nextFilters = { ...(filters.value as Record<string, DataTableFilter>) };
    const column = props.columns.find((col) => resolveFilterKey(col) === field);
    const filterConfig = column ? getFilterConfig(column) : null;

    if (column?.defaultFilter) {
        nextFilters[field] = column.defaultFilter as DataTableFilter;
    } else {
        nextFilters[field] = {
            operator: filterConfig?.operator || 'and',
            constraints: [{ value: null, matchMode: getDefaultMatchMode(column ?? { field: '', header: '' }, filterConfig) as FilterConstraint['matchMode'] }],
        };
    }

    filters.value = nextFilters as any;
    store.patch(props.tableKey, {
        filters: nextFilters,
        first: 0,
    });
    emit('filter-change', nextFilters);
    fetchData();
};

const clearSingleFilterConstraint = (field: string, constraintIndex: number): void => {
    const current = (filters.value as Record<string, DataTableFilter>)[field];
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

    const nextFilters = {
        ...(filters.value as Record<string, DataTableFilter>),
        [field]: {
            operator: current.operator ?? 'and',
            constraints: nextConstraints,
        } as DataTableFilter,
    };

    filters.value = nextFilters as any;
    store.patch(props.tableKey, {
        filters: nextFilters,
        first: 0,
    });
    emit('filter-change', nextFilters);
    fetchData();
};

const resolveLookupDisplayLabel = (column: ColumnDef, option: LookupOption): string => {
    const filterConfig = getFilterConfig(column);
    const labelKey = filterConfig?.lookupOptionLabel;
    if (!labelKey) {
        return option.label;
    }

    if (labelKey === 'label') {
        return option.label;
    }

    const metaValue = option.meta?.[labelKey];
    if (metaValue !== undefined && metaValue !== null) {
        return String(metaValue);
    }

    return option.label;
};

const onLookupSelectionMeta = (
    column: ColumnDef,
    filterModel: { value: unknown; displayValue?: string | string[] | null },
    options: LookupOption[],
): void => {
    const isMultiple = Array.isArray(filterModel.value);
    const resolvedLabels = options.map((option) => resolveLookupDisplayLabel(column, option));

    if (isMultiple) {
        filterModel.displayValue = resolvedLabels;
        return;
    }

    filterModel.displayValue = resolvedLabels[0] ?? null;
};

const formatFilterValue = (constraint: FilterConstraint): string => {
    const value = constraint.displayValue ?? constraint.value;

    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(', ');
    }

    if (value instanceof Date) {
        return value.toLocaleDateString('tr-TR');
    }

    if (typeof value === 'boolean') {
        return value ? 'Evet' : 'Hayır';
    }

    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return String(value);
};

const activeFilterRows = computed(() => {
    const rows: Array<{ key: string; field: string; label: string; value: string; constraintIndex: number }> = [];
    const fieldLabelMap = new Map(props.columns.map((column) => [resolveFilterKey(column), column.header]));

    Object.entries(filters.value as Record<string, DataTableFilter>).forEach(([field, filter]) => {
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
                value: formatFilterValue(constraint as FilterConstraint),
                constraintIndex: index,
            });
        });
    });

    return rows;
});

const toggleActiveFiltersPopover = (event: Event): void => {
    activeFiltersPopoverRef.value?.toggle(event);
};

const onRowToggle = (data: unknown) => {
    emit('row-toggle', data);
};

const exporting = ref(false);

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
        const disposition = Array.isArray(dispositionHeader) ? dispositionHeader[0] || '' : (dispositionHeader as string | undefined) || '';
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
    } catch (error: any) {
        toast.add({
            severity: 'error',
            summary: 'Export Hatası',
            detail: error?.message || 'Excel oluşturulurken hata oluştu',
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

<style scoped>
@media (max-width: 640px) {
    .responsive-datatable :deep(.p-datatable-header) {
        padding: 0.5rem;
    }

    .responsive-datatable :deep(.p-paginator) {
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
    }

    .responsive-datatable :deep(.p-paginator .p-paginator-left) {
        order: 2;
        justify-content: center;
    }

    .responsive-datatable :deep(.p-paginator .p-paginator-right) {
        order: 1;
        justify-content: center;
    }

    .responsive-datatable :deep(.p-paginator .p-dropdown) {
        width: 100%;
        max-width: 120px;
    }

    .responsive-datatable :deep(.p-datatable-tbody > tr > td) {
        padding: 0.5rem;
        font-size: 0.875rem;
    }

    .responsive-datatable :deep(.p-datatable-thead > tr > th) {
        padding: 0.5rem;
        font-size: 0.875rem;
    }
}

@media (max-width: 768px) {
    .responsive-datatable :deep(.p-datatable) {
        font-size: 0.875rem;
    }

    .responsive-datatable :deep(.p-paginator) {
        flex-wrap: wrap;
        gap: 0.5rem;
    }
}

@media (max-width: 480px) {

    .responsive-datatable :deep(.p-paginator .p-paginator-first),
    .responsive-datatable :deep(.p-paginator .p-paginator-last) {
        display: none;
    }

    .responsive-datatable :deep(.p-paginator .p-paginator-pages) {
        display: flex;
        gap: 0.25rem;
    }
}
</style>
