<template>
    <DataTable :value="tableState?.data" :lazy="true" :paginator="true" :rows="tableState?.rows"
        :totalRecords="tableState?.total" :loading="tableState?.loading" :first="tableState?.first"
        :sortField="tableState?.sortField" :sortOrder="tableState?.sortOrder" v-model:filters="filters"
        filterDisplay="menu" :globalFilterFields="globalFilterFields" removableSort @page="onPage" @sort="onSort"
        @filter="onFilter" dataKey="id" :rowsPerPageOptions="[10, 25, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        size="small" class="responsive-datatable" showGridlines :expandedRows="expandedRows" @row-toggle="onRowToggle"
        v-model:selection="selectedRows" :selectionMode="selectionMode">
        <template #header>
            <div class="flex flex-col gap-4">
                <div v-if="$slots['header-actions']" class="flex flex-wrap gap-2">
                    <slot name="header-actions"></slot>
                </div>

                <div class="flex flex-row flex-wrap items-center gap-3">
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
        <Column v-for="col in visibleColumnsData" :key="col.field" :field="col.field" :header="col.header"
            :sortable="col.sortable !== false" :dataType="col.dataType || 'text'"
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
                <div v-else-if="resolveFilterType(col) === 'lookup' || resolveFilterType(col) === 'lookup-multiple'" class="w-full"
                    @mousedown.stop @click.stop>
                    <LookupSelect v-model="filterModel.value" :endpoint="getFilterConfig(col)?.lookupEndpoint ?? ''"
                        :multiple="resolveFilterType(col) === 'lookup-multiple'"
                        :filters="getFilterConfig(col)?.lookupParams"
                        :fetcher="lookupFetcher"
                        :placeholder="resolveFilterPlaceholder(col)"
                        :disabled="!getFilterConfig(col)?.lookupEndpoint"
                        @selection-meta="(options) => onLookupSelectionMeta(filterModel, options)" class="w-full" />
                </div>
                <Select v-else-if="resolveFilterType(col) === 'select' || resolveFilterType(col) === 'boolean'"
                    v-model="filterModel.value" :options="resolveSelectOptions(col)"
                    :optionLabel="getFilterOptionLabel(col)" :optionValue="getFilterOptionValue(col)"
                    :placeholder="resolveFilterPlaceholder(col)" size="small" class="w-full" />
                <DatePicker v-else-if="resolveFilterType(col) === 'date-range'" v-model="filterModel.value"
                    selectionMode="range" dateFormat="dd/mm/yy" :placeholder="resolveFilterPlaceholder(col)"
                    size="small" class="w-full" />
                <InputNumber v-else-if="col.dataType === 'numeric'" v-model="filterModel.value"
                    :placeholder="resolveFilterPlaceholder(col, 'Değer')" size="small" class="w-full" />
                <DatePicker v-else-if="resolveFilterType(col) === 'date'" v-model="filterModel.value" dateFormat="dd/mm/yy"
                    :placeholder="resolveFilterPlaceholder(col, 'Tarih seç')" size="small" class="w-full" />
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
                        :aria-label="`${row.label} filtresini kaldır`" @click="clearSingleFilter(row.field)" />
                </div>
            </div>

            <div v-else class="rounded-md border border-dashed border-surface-300 px-3 py-4 text-center text-sm text-surface-500 dark:border-surface-700">
                Aktif filtre bulunmuyor.
            </div>
        </div>
    </Popover>
</template>

<script setup lang="ts">
import { LookupSelect, type LookupFetcher, type LookupOption } from '@zyd-labs/primevue-lookup';
import type { ColumnDef, ColumnFilterConfig, DataTableFilter, FilterConstraint } from '../types/datatable';
import { useDatatable } from '../composables/useDatatable';
import { useDatatableStore } from '../stores/datatable.store';
import { FilterMatchMode } from '@primevue/core/api';
import { Button, Column, DataTable, DatePicker, InputNumber, InputText, MultiSelect, Popover, Select, Skeleton } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, defineComponent, h, onMounted, provide, ref, watch, type VNode } from 'vue';

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
    lookupFetcher?: LookupFetcher;
}>(), {
    defaultRows: 10,
    actionsHeader: 'İşlemler',
    selectionMode: undefined,
});

const emit = defineEmits<{
    (e: 'row-toggle', data: unknown): void;
    (e: 'selection-change', rows: unknown[]): void;
    (e: 'filters-change', filters: Record<string, DataTableFilter>): void;
}>();

const store = useDatatableStore();
const toast = useToast();
const activeFiltersPopoverRef = ref();
const visibleColumns = ref<string[]>(props.columns.filter((c) => c.visible !== false).map((c) => c.field));
const filters = ref<Record<string, any>>({});
const selectedRows = ref<unknown[]>([]);

watch(
    selectedRows,
    (rows) => {
        emit('selection-change', rows);
    },
    { deep: true },
);

const tableState = computed(() => {
    const state = store.tables[props.tableKey];
    if (!state) return state;

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

const { fetchData: apiFetch, exportData: apiExport } = useDatatable(props.endpoint);

const getFilterConfig = (column: ColumnDef): ColumnFilterConfig | null => {
    return typeof column.filter === 'object' ? column.filter : null;
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

const getFilterOptions = (column: ColumnDef): Array<Record<string, unknown>> => {
    return (getFilterConfig(column)?.filterOptions ?? []) as Array<Record<string, unknown>>;
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

const resolveSelectOptions = (column: ColumnDef): Array<Record<string, unknown>> => {
    if (resolveFilterType(column) === 'boolean' && !getFilterConfig(column)?.filterOptions?.length) {
        return [{ label: 'Evet', value: 1 }, { label: 'Hayır', value: 0 }];
    }

    return getFilterOptions(column);
};

const initFilters = (): Record<string, DataTableFilter> => {
    const filterObj: Record<string, DataTableFilter> = {};
    props.columns.forEach((col) => {
        if (col.filter !== false) {
            const filterConfig = getFilterConfig(col);

            if (col.defaultFilter) {
                filterObj[col.field] = col.defaultFilter as DataTableFilter;
            } else {
                filterObj[col.field] = {
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
    filters.value = filterObj as any;
    return filterObj;
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

// Component to handle render function results (VNode, string, or number)
const RenderCell = defineComponent({
    props: {
        renderResult: {
            type: [Object, String, Number] as unknown as () => VNode | string | number,
            required: true
        }
    },
    setup(props: { renderResult: VNode | string | number }) {
        return () => {
            if (isVNode(props.renderResult)) {
                return props.renderResult;
            }
            // Convert number to string for innerHTML
            const content = typeof props.renderResult === 'number'
                ? String(props.renderResult)
                : (props.renderResult as string);
            return h('div', {
                innerHTML: content,
                class: 'render-content'
            });
        };
    }
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

const normalizeFilterConstraints = (filter: unknown): FilterConstraint[] => {
    if (!filter || typeof filter !== 'object') {
        return [];
    }

    const typedFilter = filter as {
        constraints?: Array<{ value: unknown; matchMode?: string; displayValue?: unknown }>;
        value?: unknown;
        matchMode?: string;
        displayValue?: unknown;
    };

    if (Array.isArray(typedFilter.constraints)) {
        return typedFilter.constraints.map((constraint) => ({
            value: constraint.value,
            matchMode: (constraint.matchMode ?? FilterMatchMode.CONTAINS) as FilterConstraint['matchMode'],
            displayValue: constraint.displayValue,
        }));
    }

    if ('value' in typedFilter) {
        return [{
            value: typedFilter.value,
            matchMode: (typedFilter.matchMode ?? FilterMatchMode.CONTAINS) as FilterConstraint['matchMode'],
            displayValue: typedFilter.displayValue,
        }];
    }

    return [];
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

const cleanFilters = (rawFilters: Record<string, DataTableFilter>) => {
    const cleaned: Record<string, DataTableFilter> = {};

    Object.keys(rawFilters).forEach((field) => {
        if (field === 'global') return;

        const filter = rawFilters[field];
        const constraints = normalizeFilterConstraints(filter);
        if (constraints.length === 0) return;

        const validConstraints = constraints.filter((constraint) => {
            return !isConstraintValueEmpty(constraint.value);
        });

        if (validConstraints.length > 0) {
            const processedConstraints = validConstraints.map((constraint: FilterConstraint) => ({
                value: formatDateValue(constraint.value),
                matchMode: constraint.matchMode,
            }));

            cleaned[field] = {
                ...filter,
                constraints: processedConstraints,
            };
        }
    });

    return cleaned;
};

const fetchData = async () => {
    if (!tableState.value) return;

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
    store.patch(props.tableKey, { filters: event.filters, first: 0 });
    emit('filters-change', event.filters as Record<string, DataTableFilter>);
    fetchData();
};

watch(visibleColumns, (newVal) => {
    try {
        localStorage.setItem(`dt-columns-${props.tableKey}`, JSON.stringify(newVal));
    } catch (error) {
        console.warn('localStorage yazma hatası:', error);
    }
}, { deep: true });

onMounted(() => {
    const initialFilters = initFilters();

    store.init(props.tableKey, {
        rows: props.defaultRows,
        sortField: props.defaultSortField,
        sortOrder: props.defaultSortOrder !== undefined ? (Number(props.defaultSortOrder) as 1 | -1) : undefined,
        filters: initialFilters,
    });

    try {
        const savedColumns = localStorage.getItem(`dt-columns-${props.tableKey}`);
        if (savedColumns) {
            const parsedColumns = JSON.parse(savedColumns);
            const validColumns = parsedColumns.filter((col: string) => props.columns.some((propCol) => propCol.field === col && propCol.visible !== false));
            if (validColumns.length > 0) {
                visibleColumns.value = validColumns;
            }
        }
    } catch (error) {
        console.warn('localStorage okuma hatası:', error);
        visibleColumns.value = props.columns.filter((c) => c.visible !== false).map((c) => c.field);
    }

    fetchData();
});

const refreshData = () => {
    fetchData();
};

provide('refreshTable', refreshData);

const clearFilters = () => {
    const clearedFilters: Record<string, DataTableFilter> = {};
    props.columns.forEach((col) => {
        if (col.filter !== false) {
            const filterConfig = getFilterConfig(col);

            if (col.defaultFilter) {
                clearedFilters[col.field] = col.defaultFilter as DataTableFilter;
            } else if (filterConfig?.constraints?.length) {
                clearedFilters[col.field] = {
                    operator: filterConfig.operator || 'and',
                    constraints: filterConfig.constraints,
                } as DataTableFilter;
            } else {
                clearedFilters[col.field] = {
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
    fetchData();
};

const clearSingleFilter = (field: string): void => {
    const column = props.columns.find((col) => col.field === field);
    if (!column || column.filter === false) {
        return;
    }

    const filterConfig = getFilterConfig(column);
    const nextFilters = { ...(filters.value as Record<string, DataTableFilter>) };
    nextFilters[field] = {
        operator: filterConfig?.operator || 'and',
        constraints: [
            {
                value: null,
                matchMode: getDefaultMatchMode(column, filterConfig),
            },
        ],
    };

    filters.value = nextFilters as any;
    store.patch(props.tableKey, {
        filters: nextFilters,
        first: 0,
    });
    fetchData();
};

const onLookupSelectionMeta = (filterModel: FilterConstraint, options: LookupOption[]): void => {
    if (Array.isArray(filterModel.value)) {
        filterModel.displayValue = options.map((option) => option.label);
        return;
    }

    filterModel.displayValue = options[0]?.label ?? null;
};

const formatFilterDisplayValue = (constraint: FilterConstraint): string => {
    const value = constraint.displayValue ?? constraint.value;

    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(', ');
    }

    if (value instanceof Date) {
        return value.toLocaleDateString('tr-TR');
    }

    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return String(value);
};

const activeFilterRows = computed(() => {
    const rows: Array<{ key: string; field: string; label: string; value: string }> = [];

    Object.entries(filters.value as Record<string, DataTableFilter>).forEach(([field, filter]) => {
        if (!filter?.constraints) {
            return;
        }

        const column = props.columns.find((item) => item.field === field);
        const label = column?.header ?? field;
        const constraints = normalizeFilterConstraints(filter);
        constraints.forEach((constraint, index) => {
            if (isConstraintValueEmpty(constraint.value)) {
                return;
            }

            rows.push({
                key: `${field}-${index}`,
                field,
                label,
                value: formatFilterDisplayValue(constraint as FilterConstraint),
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
    if (!tableState.value) return;

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
