<template>
    <DataTable
        ref="dataTableRef"
        :value="data"
        :lazy="true"
        :paginator="true"
        :rows="rows"
        :totalRecords="total"
        :loading="loading"
        :first="first"
        :sortField="sortField"
        :sortOrder="sortOrder"
        v-model:filters="filtersModel"
        filterDisplay="menu"
        :globalFilterFields="globalFilterFields"
        removableSort
        @page="emit('page', $event)"
        @sort="emit('sort', $event)"
        @filter="emit('filter', $event)"
        dataKey="id"
        :rowsPerPageOptions="rowsPerPageOptions"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        size="small"
        class="responsive-datatable"
        showGridlines
        v-model:expandedRows="expandedRowsModel"
        @row-toggle="emit('row-toggle', $event)"
        v-model:selection="selectionModel"
        :selectionMode="selectionMode"
    >
        <template #header>
            <div class="flex flex-col gap-4">
                <div v-if="$slots['header-actions']" class="flex flex-wrap gap-2">
                    <slot name="header-actions"></slot>
                </div>

                <div class="flex flex-row flex-wrap items-center gap-3">
                    <InputText
                        :model-value="globalSearchValue"
                        type="text"
                        :placeholder="labels.globalSearchPlaceholder"
                        size="small"
                        class="w-full sm:w-[15rem] md:flex-1"
                        @update:model-value="onGlobalSearchUpdate"
                    />

                    <div class="flex items-center gap-2 shrink-0">
                        <Button
                            icon="pi pi-sync"
                            severity="secondary"
                            size="small"
                            :aria-label="labels.refresh"
                            v-tooltip="labels.refresh"
                            @click="emit('refresh')"
                        />
                        <Button
                            type="button"
                            icon="pi pi-filter-slash"
                            severity="secondary"
                            size="small"
                            :aria-label="labels.activeFilters"
                            v-tooltip="labels.activeFilters"
                            @click="emit('toggle-active-filters', $event)"
                        />
                        <Button
                            icon="pi pi-file-excel"
                            severity="success"
                            size="small"
                            :loading="exporting"
                            :disabled="exporting || loading"
                            :aria-label="labels.exportExcel"
                            v-tooltip="labels.exportExcel"
                            @click="emit('export')"
                        />
                    </div>

                    <MultiSelect
                        :model-value="visibleColumns"
                        :options="columns"
                        optionLabel="header"
                        optionValue="field"
                        :placeholder="labels.selectColumns"
                        display="chip"
                        :maxSelectedLabels="2"
                        size="small"
                        class="min-w-[10rem] max-w-[14rem] shrink-0"
                        @update:model-value="emit('update:visibleColumns', $event)"
                    />
                </div>
            </div>
        </template>

        <template #empty>
            <slot
                name="empty"
                :has-active-filters="hasActiveFiltersOrSearch"
                :global-filter="globalSearchValue"
                :global-search="globalSearchValue"
            >
                <div class="py-8 text-center">
                    <i class="pi pi-inbox mb-4 text-4xl text-surface-400" aria-hidden="true" />
                    <p class="text-surface-500">
                        {{ hasActiveFiltersOrSearch ? labels.emptyFiltered : labels.empty }}
                    </p>
                </div>
            </slot>
        </template>

        <template #loading>
            <Skeleton height="3rem" class="mb-2" v-for="i in 5" :key="i" />
        </template>

        <Column
            v-if="selectionMode"
            :selectionMode="selectionMode"
            :exportable="false"
            headerStyle="width: 3rem"
            style="width: 3rem"
        />
        <Column
            v-if="$slots.expansion"
            :exportable="false"
            :expander="true"
            headerStyle="width: 3rem"
        />
        <Column
            v-for="col in visibleColumnsData"
            :key="col.field"
            :field="col.field"
            :filterField="col.filterField ?? col.field"
            :header="col.header"
            :sortable="col.sortable !== false"
            :dataType="resolveColumnDataType(col)"
            :showFilterMatchModes="col.filter === false ? false : !(getFilterConfig(col)?.showMatchModes === false)"
            :showFilterOperator="col.filter === false ? false : !(getFilterConfig(col)?.showOperator === false)"
        >
            <template #body="slotProps" v-if="col.render">
                <DataTableCellRender :render="col.render" :data="slotProps.data" />
            </template>

            <template #filter="{ filterModel }" v-if="col.filter !== false">
                <DataTableFilterField
                    :column="col"
                    :model-value="filterModel.value"
                    @update:model-value="(value) => { filterModel.value = value; }"
                    @selection-meta="(options) => emit('lookup-selection-meta', { column: col, filterModel, options })"
                />
            </template>
        </Column>

        <Column v-if="$slots.actions" :exportable="false" :header="actionsHeader">
            <template #body="slotProps">
                <div class="flex items-center justify-start gap-2">
                    <slot name="actions" :data="slotProps.data"></slot>
                </div>
            </template>
        </Column>

        <template #paginatorstart>
            <div class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <i class="pi pi-info-circle" aria-hidden="true" />
                <span>Toplam: <strong>{{ total || 0 }}</strong> kayıt</span>
            </div>
        </template>

        <template v-if="$slots.expansion" #expansion="{ data }">
            <slot name="expansion" :data="data"></slot>
        </template>
    </DataTable>
</template>

<script setup lang="ts">
import type { LookupOption } from '@zyd-labs/primevue-lookup';
import {
    Button,
    Column,
    DataTable,
    InputText,
    MultiSelect,
    Skeleton,
} from 'primevue';
import { computed, ref } from 'vue';
import type { ColumnDef, DataTableFilter } from '../../types/datatable';
import { DATATABLE_ROWS_PER_PAGE_OPTIONS } from '../../types/datatable';
import {
    getFilterConfig,
    resolveColumnDataType,
} from '../../utils/columnFilters';
import { DATATABLE_LABELS } from '../../utils/labels';
import DataTableCellRender from './DataTableCellRender';
import DataTableFilterField from './DataTableFilterField.vue';

const props = withDefaults(defineProps<{
    data: unknown[];
    first: number;
    rows: number;
    total: number;
    loading: boolean;
    exporting: boolean;
    sortField?: string;
    sortOrder?: 1 | -1;
    filters: Record<string, DataTableFilter>;
    globalFilterFields?: string[];
    globalSearchValue: string;
    columns: ColumnDef[];
    visibleColumns: string[];
    actionsHeader?: string;
    selectionMode?: 'single' | 'multiple';
    selectedRows: unknown[];
    expandedRows: Record<number | string, boolean>;
    activeFilterCount: number;
    rowsPerPageOptions?: number[];
}>(), {
    actionsHeader: DATATABLE_LABELS.actions,
    rowsPerPageOptions: () => [...DATATABLE_ROWS_PER_PAGE_OPTIONS],
});

const emit = defineEmits<{
    (e: 'page', event: unknown): void;
    (e: 'sort', event: unknown): void;
    (e: 'filter', event: unknown): void;
    (e: 'row-toggle', event: unknown): void;
    (e: 'refresh'): void;
    (e: 'export'): void;
    (e: 'toggle-active-filters', event: Event): void;
    (e: 'update:globalSearchValue', value: string): void;
    (e: 'update:visibleColumns', value: string[]): void;
    (e: 'update:selectedRows', value: unknown[]): void;
    (e: 'update:expandedRows', value: Record<number | string, boolean>): void;
    (e: 'update:filters', value: Record<string, DataTableFilter>): void;
    (e: 'lookup-selection-meta', payload: {
        column: ColumnDef;
        filterModel: { value: unknown; displayValue?: string | string[] | null };
        options: LookupOption[];
    }): void;
}>();

const labels = DATATABLE_LABELS;
const dataTableRef = ref<InstanceType<typeof DataTable> | null>(null);

const visibleColumnsData = computed(() =>
    props.columns.filter((col) => props.visibleColumns.includes(col.field)),
);

const hasActiveFiltersOrSearch = computed(() => {
    return props.activeFilterCount > 0 || Boolean(props.globalSearchValue?.trim());
});

const filtersModel = computed({
    get: () => props.filters as Record<string, unknown>,
    set: (value: Record<string, DataTableFilter>) => emit('update:filters', value),
});

const selectionModel = computed({
    get: () => props.selectedRows,
    set: (value: unknown[]) => emit('update:selectedRows', value),
});

const expandedRowsModel = computed({
    get: () => props.expandedRows,
    set: (value: Record<number | string, boolean>) => emit('update:expandedRows', value),
});

const onGlobalSearchUpdate = (value: string | undefined): void => {
    emit('update:globalSearchValue', value ?? '');
};

defineExpose({
    dataTableRef,
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
