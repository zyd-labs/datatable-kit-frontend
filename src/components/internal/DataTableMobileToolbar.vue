<template>
    <div class="flex flex-col gap-3">
        <div v-if="$slots['header-actions']" class="flex flex-wrap gap-2">
            <slot name="header-actions"></slot>
        </div>

        <InputText
            :model-value="globalSearchValue"
            type="search"
            :placeholder="labels.globalSearchPlaceholder"
            class="w-full min-h-11"
            @update:model-value="onSearchUpdate"
        />

        <div class="flex flex-wrap items-center gap-2">
            <Button
                type="button"
                :label="filtersLabel"
                icon="pi pi-filter"
                severity="secondary"
                class="min-h-11"
                :aria-label="labels.filters"
                @click="emit('open-filters')"
            />

            <Button
                v-if="hasSortableColumns"
                type="button"
                :label="labels.sort"
                icon="pi pi-sort-alt"
                severity="secondary"
                class="min-h-11"
                :aria-label="labels.sort"
                @click="emit('open-sort')"
            />

            <Button
                type="button"
                icon="pi pi-sync"
                severity="secondary"
                class="min-h-11 min-w-11"
                :aria-label="labels.refresh"
                v-tooltip="labels.refresh"
                @click="emit('refresh')"
            />

            <Button
                type="button"
                icon="pi pi-file-excel"
                severity="success"
                class="min-h-11 min-w-11"
                :loading="exporting"
                :disabled="exporting || loading"
                :aria-label="labels.exportExcel"
                v-tooltip="labels.exportExcel"
                @click="emit('export')"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { Button, InputText } from 'primevue';
import { computed } from 'vue';
import { DATATABLE_LABELS } from '../../utils/labels';

const props = defineProps<{
    globalSearchValue: string;
    activeFilterCount: number;
    hasSortableColumns: boolean;
    exporting: boolean;
    loading: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:globalSearchValue', value: string): void;
    (e: 'open-filters'): void;
    (e: 'open-sort'): void;
    (e: 'refresh'): void;
    (e: 'export'): void;
}>();

const labels = DATATABLE_LABELS;

const filtersLabel = computed(() => {
    if (props.activeFilterCount > 0) {
        return `${labels.filters} (${props.activeFilterCount})`;
    }

    return labels.filters;
});

const onSearchUpdate = (value: string | undefined): void => {
    emit('update:globalSearchValue', value ?? '');
};
</script>
