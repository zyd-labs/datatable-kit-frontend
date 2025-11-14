<template>
    <DataTable :value="tableState?.data" :lazy="true" :paginator="true" :rows="tableState?.rows"
        :totalRecords="tableState?.total" :loading="tableState?.loading" :first="tableState?.first"
        :sortField="tableState?.sortField" :sortOrder="tableState?.sortOrder" v-model:filters="filters"
        filterDisplay="menu" :globalFilterFields="globalFilterFields" removableSort @page="onPage" @sort="onSort"
        @filter="onFilter" dataKey="id" :rowsPerPageOptions="[10, 25, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        size="small" class="responsive-datatable" showGridlines :expandedRows="expandedRows" @row-toggle="onRowToggle">
        <template #header>
            <div class="flex flex-col gap-4">
                <div v-if="$slots['header-actions']" class="flex flex-wrap gap-2">
                    <slot name="header-actions"></slot>
                </div>

                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <IconField iconPosition="left" class="flex-1 sm:flex-none">
                            <InputIcon class="pi pi-search" />
                            <InputText v-model="searchValue" placeholder="Ara..." @input="onSearchInput" size="small"
                                class="w-full sm:w-80" />
                        </IconField>

                        <div class="flex items-center gap-2">
                            <Button icon="pi pi-sync" severity="secondary" size="small" @click="refreshData"
                                v-tooltip="'Yenile'" />
                            <Button icon="pi pi-filter-slash" severity="secondary" size="small" @click="clearFilters"
                                v-tooltip="'Filtreleri Temizle'" />
                            <Button icon="pi pi-file-excel" severity="success" size="small" :loading="exporting"
                                :disabled="exporting || tableState?.loading" @click="exportTable"
                                v-tooltip="'Excel olarak indir'" />
                        </div>
                    </div>

                    <MultiSelect v-model="visibleColumns" :options="columns" optionLabel="header" optionValue="field"
                        placeholder="Sütunları Seç" display="chip" :maxSelectedLabels="3" size="small"
                        class="w-full sm:w-80" />
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

        <Column v-if="$slots.expansion" :exportable="false" :expander="true" headerStyle="width: 3rem" />
        <Column v-for="col in visibleColumnsData" :key="col.field" :field="col.field" :header="col.header"
            :sortable="col.sortable !== false" :dataType="col.dataType || 'text'"
            :showFilterMatchModes="col.filter === false ? false : !(getFilterConfig(col)?.showMatchModes === false)"
            :showFilterOperator="col.filter === false ? false : !(getFilterConfig(col)?.showOperator === false)">
            <template #body="slotProps" v-if="col.render">
                <component v-if="isComponent(col.render)" :is="col.render" :data="slotProps.data" />
                <div v-else-if="typeof col.render === 'function'" v-html="(col.render as Function)(slotProps.data)"
                    class="render-content"></div>
            </template>

            <template #filter="{ filterModel }" v-if="col.filter !== false">
                <MultiSelect v-if="getFilterConfig(col)?.filterType === 'multi-select'" v-model="filterModel.value"
                    :options="getFilterConfig(col)?.filterOptions || []" optionLabel="label" optionValue="value"
                    :maxSelectedLabels="getFilterConfig(col)?.maxSelectedLabels ?? 3" filter
                    :placeholder="getFilterConfig(col)?.placeholder ?? 'Seçiniz'" size="small" class="w-full" />
                <Select v-else-if="col.dataType === 'boolean' || getFilterConfig(col)?.filterType === 'select'"
                    v-model="filterModel.value"
                    :options="getFilterConfig(col)?.filterOptions || [{ label: 'Evet', value: 1 }, { label: 'Hayır', value: 0 }]"
                    optionLabel="label" optionValue="value"
                    :placeholder="getFilterConfig(col)?.placeholder ?? 'Seçiniz'" size="small" />
                <InputNumber v-else-if="col.dataType === 'numeric'" v-model="filterModel.value" placeholder="Değer"
                    size="small" />
                <DatePicker v-else-if="col.dataType === 'date'" v-model="filterModel.value" dateFormat="dd/mm/yy"
                    placeholder="Tarih seç" size="small" />
                <InputText v-else v-model="filterModel.value" type="text" placeholder="Ara..." size="small" />
            </template>
        </Column>

        <Column v-if="$slots.actions" :exportable="false" :header="actionsHeader">
            <template #body="slotProps">
                <div class="flex gap-1 justify-start items-center ">
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
</template>

<script setup lang="ts">
import type { ColumnDef, ColumnFilterConfig, DataTableFilter } from '../types/datatable';
import { useDatatable } from '../composables/useDatatable';
import { useDatatableStore } from '../stores/datatable.store';
import { FilterMatchMode } from '@primevue/core/api';
import { useDebounceFn } from '@vueuse/core';
import { Button, Column, DataTable, DatePicker, IconField, InputIcon, InputNumber, InputText, MultiSelect, Select, Skeleton } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, provide, ref, watch } from 'vue';

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
}>(), {
    defaultRows: 10,
    actionsHeader: 'İşlemler',
});

const emit = defineEmits<{
    (e: 'row-toggle', data: unknown): void;
}>();

const store = useDatatableStore();
const toast = useToast();
const searchValue = ref('');
const visibleColumns = ref<string[]>(props.columns.filter((c) => c.visible !== false).map((c) => c.field));
const filters = ref<Record<string, any>>({});

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
                            matchMode: getDefaultMatchMode(col.dataType, filterConfig),
                        },
                    ],
                } as DataTableFilter;
            }
        }
    });
    filters.value = filterObj as any;
    return filterObj;
};

const getDefaultMatchMode = (dataType?: string, filter?: ColumnFilterConfig | null) => {
    if (filter?.filterType === 'multi-select') {
        return FilterMatchMode.IN;
    }
    switch (dataType) {
        case 'numeric':
            return FilterMatchMode.EQUALS;
        case 'date':
            return FilterMatchMode.DATE_IS;
        case 'boolean':
            return FilterMatchMode.EQUALS;
        case 'multi-select':
            return FilterMatchMode.IN;
        default:
            return FilterMatchMode.CONTAINS;
    }
};

const isComponent = (value: unknown): boolean => {
    return Boolean(value && typeof value === 'object' && ('template' in (value as Record<string, unknown>) || 'render' in (value as Record<string, unknown>) || 'setup' in (value as Record<string, unknown>)));
};

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

const cleanFilters = (rawFilters: Record<string, DataTableFilter>) => {
    const cleaned: Record<string, DataTableFilter> = {};

    Object.keys(rawFilters).forEach((field) => {
        if (field === 'global') return;

        const filter = rawFilters[field];
        if (!filter || !filter.constraints) return;

        const validConstraints = filter.constraints.filter((constraint: any) => {
            return !isConstraintValueEmpty(constraint.value);
        });

        if (validConstraints.length > 0) {
            const column = props.columns.find((col) => col.field === field);
            if (column?.dataType === 'date') {
                const processedConstraints = validConstraints.map((constraint: any) => {
                    if (constraint.value instanceof Date) {
                        const year = constraint.value.getFullYear();
                        const month = String(constraint.value.getMonth() + 1).padStart(2, '0');
                        const day = String(constraint.value.getDate()).padStart(2, '0');
                        return {
                            ...constraint,
                            value: `${year}-${month}-${day}`,
                        };
                    }

                    if (typeof constraint.value === 'string' && constraint.value.includes('T')) {
                        const date = new Date(constraint.value);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return {
                            ...constraint,
                            value: `${year}-${month}-${day}`,
                        };
                    }

                    return constraint;
                });

                cleaned[field] = {
                    ...filter,
                    constraints: processedConstraints,
                };
            } else {
                cleaned[field] = {
                    ...filter,
                    constraints: validConstraints,
                };
            }
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
    fetchData();
};

const onSearchInput = useDebounceFn((event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    store.patch(props.tableKey, { globalFilter: value, first: 0 });
    fetchData();
}, 300);

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
                            matchMode: getDefaultMatchMode(col.dataType, filterConfig),
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
    searchValue.value = '';
    fetchData();
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

defineExpose({
    refreshData,
    clearFilters,
    exportTable,
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
