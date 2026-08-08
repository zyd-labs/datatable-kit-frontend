<template>
    <div class="flex flex-col gap-3 border-t border-surface-200 pt-3 dark:border-surface-700">
        <div class="text-sm text-surface-600 dark:text-surface-300">
            {{ rangeLabel }}
        </div>

        <div class="flex items-center justify-between gap-2">
            <Button
                type="button"
                :label="labels.previous"
                icon="pi pi-chevron-left"
                severity="secondary"
                class="min-h-11"
                :disabled="!canGoPrevious"
                :aria-label="labels.previous"
                @click="goPrevious"
            />
            <Button
                type="button"
                :label="labels.next"
                icon="pi pi-chevron-right"
                iconPos="right"
                severity="secondary"
                class="min-h-11"
                :disabled="!canGoNext"
                :aria-label="labels.next"
                @click="goNext"
            />
        </div>

        <div class="flex items-center gap-2">
            <label class="text-sm text-surface-600 dark:text-surface-300" for="dt-mobile-rows">
                {{ labels.rowsPerPage }}
            </label>
            <Select
                inputId="dt-mobile-rows"
                :model-value="rows"
                :options="rowsPerPageOptions"
                class="min-w-[6rem]"
                @update:model-value="onRowsChange"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { Button, Select } from 'primevue';
import { computed } from 'vue';
import { DATATABLE_ROWS_PER_PAGE_OPTIONS } from '../../types/datatable';
import { DATATABLE_LABELS } from '../../utils/labels';

const props = withDefaults(defineProps<{
    first: number;
    rows: number;
    total: number;
    rowsPerPageOptions?: number[];
}>(), {
    rowsPerPageOptions: () => [...DATATABLE_ROWS_PER_PAGE_OPTIONS],
});

const emit = defineEmits<{
    (e: 'page', payload: { first: number; rows: number }): void;
}>();

const labels = DATATABLE_LABELS;

const rangeLabel = computed(() => {
    if (props.total <= 0) {
        return `0–0 / 0 ${labels.records}`;
    }

    const start = props.first + 1;
    const end = Math.min(props.first + props.rows, props.total);

    return `${start}–${end} / ${props.total} ${labels.records}`;
});

const canGoPrevious = computed(() => props.first > 0 && props.total > 0);

const canGoNext = computed(() => {
    if (props.total <= 0) {
        return false;
    }

    return props.first + props.rows < props.total;
});

const goPrevious = (): void => {
    if (!canGoPrevious.value) {
        return;
    }

    emit('page', {
        first: Math.max(0, props.first - props.rows),
        rows: props.rows,
    });
};

const goNext = (): void => {
    if (!canGoNext.value) {
        return;
    }

    emit('page', {
        first: props.first + props.rows,
        rows: props.rows,
    });
};

const onRowsChange = (value: number): void => {
    emit('page', {
        first: 0,
        rows: value,
    });
};
</script>
