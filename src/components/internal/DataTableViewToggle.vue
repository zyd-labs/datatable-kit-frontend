<template>
    <div
        class="datatable-kit-view-toggle inline-flex overflow-hidden rounded-md border border-surface-200 dark:border-surface-700"
        role="group"
        :aria-label="labels.viewMode"
    >
        <Button
            type="button"
            icon="pi pi-list"
            :size="size"
            :severity="modelValue === 'table' ? 'primary' : 'secondary'"
            :text="modelValue !== 'table'"
            :aria-label="labels.viewTable"
            :aria-pressed="modelValue === 'table'"
            v-tooltip="labels.viewTable"
            @click="emit('update:modelValue', 'table')"
        />
        <Button
            type="button"
            icon="pi pi-th-large"
            :size="size"
            :severity="modelValue === 'cards' ? 'primary' : 'secondary'"
            :text="modelValue !== 'cards'"
            :aria-label="labels.viewCards"
            :aria-pressed="modelValue === 'cards'"
            v-tooltip="labels.viewCards"
            @click="emit('update:modelValue', 'cards')"
        />
    </div>
</template>

<script setup lang="ts">
import { Button } from 'primevue';
import type { DataViewMode } from '../../types/datatable';
import { DATATABLE_LABELS } from '../../utils/labels';

withDefaults(defineProps<{
    modelValue: DataViewMode;
    size?: 'small' | undefined;
}>(), {
    size: undefined,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: DataViewMode): void;
}>();

const labels = DATATABLE_LABELS;
</script>
