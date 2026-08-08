<template>
    <div class="flex flex-col gap-3">
        <DataTableMobileToolbar
            :global-search-value="globalSearchValue"
            :active-filter-count="activeFilterCount"
            :has-sortable-columns="hasSortableColumns"
            :exporting="exporting"
            :loading="loading"
            @update:global-search-value="emit('update:globalSearchValue', $event)"
            @open-filters="filtersVisible = true"
            @open-sort="sortVisible = true"
            @refresh="emit('refresh')"
            @export="emit('export')"
        >
            <template v-if="$slots['header-actions']" #header-actions>
                <slot name="header-actions"></slot>
            </template>
        </DataTableMobileToolbar>

        <div v-if="activeFilterRows.length" class="flex flex-wrap gap-2">
            <button
                v-for="row in activeFilterRows"
                :key="row.key"
                type="button"
                class="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800"
                :aria-label="`${row.label} filtresini kaldır`"
                @click="emit('clear-filter-constraint', { field: row.field, constraintIndex: row.constraintIndex })"
            >
                <span class="truncate">
                    <span class="text-surface-500">{{ row.label }}:</span>
                    {{ row.value }}
                </span>
                <i class="pi pi-times text-xs" aria-hidden="true" />
            </button>

            <Button
                v-if="activeFilterRows.length > 1"
                type="button"
                :label="labels.clearAllFilters"
                text
                size="small"
                severity="danger"
                class="min-h-9"
                @click="emit('clear-filters')"
            />
        </div>

        <div v-if="loading" class="flex flex-col gap-3">
            <div
                v-for="index in 4"
                :key="index"
                class="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
            >
                <Skeleton width="60%" height="1.1rem" class="mb-2" />
                <Skeleton width="80%" height="0.9rem" class="mb-3" />
                <Skeleton width="40%" height="0.8rem" class="mb-2" />
                <Skeleton width="55%" height="0.8rem" />
            </div>
        </div>

        <div v-else-if="!rows.length" class="rounded-lg border border-dashed border-surface-300 px-4 py-10 text-center dark:border-surface-700">
            <slot
                name="empty"
                :has-active-filters="hasActiveFiltersOrSearch"
                :global-filter="globalSearchValue"
                :global-search="globalSearchValue"
            >
                <i class="pi pi-inbox mb-3 text-3xl text-surface-400" aria-hidden="true" />
                <p class="text-surface-500">
                    {{ hasActiveFiltersOrSearch ? labels.emptyFiltered : labels.empty }}
                </p>
            </slot>
        </div>

        <div v-else class="flex flex-col gap-3">
            <DataTableMobileCard
                v-for="row in rows"
                :key="resolveRowKey(row)"
                :data="row"
                :columns="columns"
                :selection-mode="selectionMode"
                :is-selected="isRowSelected(row)"
                :is-expanded="isRowExpanded(row)"
                :has-expansion="hasExpansion"
                @toggle-selection="emit('toggle-selection', row)"
                @toggle-expand="emit('toggle-expand', row)"
            >
                <template v-if="$slots['mobile-card']" #mobile-card="slotProps">
                    <slot name="mobile-card" v-bind="slotProps"></slot>
                </template>
                <template v-if="$slots.actions" #actions="slotProps">
                    <slot name="actions" v-bind="slotProps"></slot>
                </template>
                <template v-if="$slots.expansion" #expansion="slotProps">
                    <slot name="expansion" v-bind="slotProps"></slot>
                </template>
            </DataTableMobileCard>
        </div>

        <DataTableMobilePaginator
            :first="first"
            :rows="rowsPerPage"
            :total="total"
            @page="emit('page', $event)"
        />

        <DataTableMobileFilters
            v-model:visible="filtersVisible"
            :columns="columns"
            :filters="filters"
            @update:filters="emit('update:filters', $event)"
            @clear-filters="emit('clear-filters')"
        />

        <DataTableMobileSort
            v-model:visible="sortVisible"
            :columns="columns"
            :sort-field="sortField"
            :sort-order="sortOrder"
            @sort="emit('sort', $event)"
        />
    </div>
</template>

<script setup lang="ts">
import { Button, Skeleton } from 'primevue';
import { computed, ref, useSlots } from 'vue';
import type { ActiveFilterRow, ColumnDef, DataTableFilter } from '../../types/datatable';
import { DATATABLE_LABELS } from '../../utils/labels';
import DataTableMobileCard from './DataTableMobileCard.vue';
import DataTableMobileFilters from './DataTableMobileFilters.vue';
import DataTableMobilePaginator from './DataTableMobilePaginator.vue';
import DataTableMobileSort from './DataTableMobileSort.vue';
import DataTableMobileToolbar from './DataTableMobileToolbar.vue';

const props = defineProps<{
    columns: ColumnDef[];
    rows: Record<string, unknown>[];
    first: number;
    rowsPerPage: number;
    total: number;
    loading: boolean;
    exporting: boolean;
    globalSearchValue: string;
    filters: Record<string, DataTableFilter>;
    activeFilterRows: ActiveFilterRow[];
    activeFilterCount: number;
    sortField?: string;
    sortOrder?: 1 | -1;
    selectionMode?: 'single' | 'multiple';
    selectedRows: unknown[];
    expandedRows: Record<string | number, boolean>;
}>();

const emit = defineEmits<{
    (e: 'update:globalSearchValue', value: string): void;
    (e: 'update:filters', value: Record<string, DataTableFilter>): void;
    (e: 'clear-filters'): void;
    (e: 'clear-filter-constraint', payload: { field: string; constraintIndex: number }): void;
    (e: 'refresh'): void;
    (e: 'export'): void;
    (e: 'page', payload: { first: number; rows: number }): void;
    (e: 'sort', payload: { sortField?: string; sortOrder?: 1 | -1 }): void;
    (e: 'toggle-selection', row: Record<string, unknown>): void;
    (e: 'toggle-expand', row: Record<string, unknown>): void;
}>();

const slots = useSlots();
const labels = DATATABLE_LABELS;
const filtersVisible = ref(false);
const sortVisible = ref(false);

const hasExpansion = computed(() => Boolean(slots.expansion));
const hasSortableColumns = computed(() =>
    props.columns.some((column) => column.sortable !== false && column.visible !== false),
);

const hasActiveFiltersOrSearch = computed(() => {
    return props.activeFilterCount > 0 || Boolean(props.globalSearchValue?.trim());
});

const resolveRowKey = (row: Record<string, unknown>): string | number => {
    const id = row.id;
    if (typeof id === 'string' || typeof id === 'number') {
        return id;
    }

    return JSON.stringify(row);
};

const isRowSelected = (row: Record<string, unknown>): boolean => {
    const key = resolveRowKey(row);
    return props.selectedRows.some((selected) => {
        if (!selected || typeof selected !== 'object') {
            return false;
        }

        return resolveRowKey(selected as Record<string, unknown>) === key;
    });
};

const isRowExpanded = (row: Record<string, unknown>): boolean => {
    const key = resolveRowKey(row);
    return Boolean(props.expandedRows[key]);
};
</script>
