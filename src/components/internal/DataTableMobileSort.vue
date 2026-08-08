<template>
    <Drawer
        :visible="visible"
        position="bottom"
        class="!h-auto max-h-[85vh]"
        @update:visible="onVisibleUpdate"
    >
        <template #header>
            <span class="font-semibold">{{ labels.sort }}</span>
        </template>

        <div class="flex flex-col gap-3 pb-4">
            <Button
                type="button"
                :label="labels.clearSort"
                severity="secondary"
                text
                class="justify-start min-h-11"
                :disabled="!sortField"
                @click="clearSort"
            />

            <div class="flex flex-col gap-1">
                <button
                    v-for="option in sortOptions"
                    :key="option.key"
                    type="button"
                    class="flex min-h-11 w-full items-center justify-between rounded-md border px-3 text-start text-sm transition-colors"
                    :class="isSelected(option)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-surface-200 bg-surface-0 text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-0'"
                    @click="selectOption(option)"
                >
                    <span>{{ option.label }}</span>
                    <i v-if="isSelected(option)" class="pi pi-check" aria-hidden="true" />
                </button>
            </div>
        </div>
    </Drawer>
</template>

<script setup lang="ts">
import { Button, Drawer } from 'primevue';
import { computed } from 'vue';
import type { ColumnDef } from '../../types/datatable';
import { DATATABLE_LABELS } from '../../utils/labels';

interface SortOption {
    key: string;
    field: string;
    order: 1 | -1;
    label: string;
}

const props = defineProps<{
    visible: boolean;
    columns: ColumnDef[];
    sortField?: string;
    sortOrder?: 1 | -1;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'sort', payload: { sortField?: string; sortOrder?: 1 | -1 }): void;
}>();

const labels = DATATABLE_LABELS;

const sortOptions = computed<SortOption[]>(() => {
    return props.columns
        .filter((column) => column.sortable !== false && column.visible !== false)
        .flatMap((column) => [
            {
                key: `${column.field}:asc`,
                field: column.field,
                order: 1 as const,
                label: `${column.header} — ${labels.sortAscending}`,
            },
            {
                key: `${column.field}:desc`,
                field: column.field,
                order: -1 as const,
                label: `${column.header} — ${labels.sortDescending}`,
            },
        ]);
});

const onVisibleUpdate = (value: boolean): void => {
    emit('update:visible', value);
};

const isSelected = (option: SortOption): boolean => {
    return props.sortField === option.field && props.sortOrder === option.order;
};

const selectOption = (option: SortOption): void => {
    emit('sort', {
        sortField: option.field,
        sortOrder: option.order,
    });
    emit('update:visible', false);
};

const clearSort = (): void => {
    emit('sort', {
        sortField: undefined,
        sortOrder: undefined,
    });
    emit('update:visible', false);
};
</script>
