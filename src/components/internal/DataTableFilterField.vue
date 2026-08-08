<template>
    <MultiSelect
        v-if="filterType === 'multi-select'"
        :model-value="modelValue"
        :options="filterOptions"
        :optionLabel="optionLabel"
        :optionValue="optionValue"
        :maxSelectedLabels="maxSelectedLabels"
        filter
        :placeholder="placeholder"
        size="small"
        class="w-full"
        @update:model-value="onValueUpdate"
    />

    <LookupSelect
        v-else-if="filterType === 'lookup' || filterType === 'lookup-multiple'"
        :model-value="modelValue"
        :endpoint="lookupEndpoint"
        :multiple="filterType === 'lookup-multiple'"
        :filters="lookupParams"
        :placeholder="placeholder"
        :disabled="!lookupEndpoint"
        class="w-full"
        @update:model-value="onValueUpdate"
        @selection-meta="onSelectionMeta"
    />

    <Select
        v-else-if="filterType === 'select' || filterType === 'boolean'"
        :model-value="modelValue"
        :options="selectOptions"
        :optionLabel="optionLabel"
        :optionValue="optionValue"
        :placeholder="placeholder"
        size="small"
        class="w-full"
        @update:model-value="onValueUpdate"
    />

    <DatePicker
        v-else-if="filterType === 'date-range'"
        :model-value="modelValue as Date | Date[] | null"
        selectionMode="range"
        dateFormat="dd/mm/yy"
        :placeholder="placeholder"
        size="small"
        class="w-full"
        @update:model-value="onValueUpdate"
    />

    <DatePicker
        v-else-if="filterType === 'date'"
        :model-value="modelValue as Date | null"
        dateFormat="dd/mm/yy"
        :placeholder="placeholder"
        size="small"
        class="w-full"
        @update:model-value="onValueUpdate"
    />

    <InputNumber
        v-else-if="dataType === 'numeric'"
        :model-value="modelValue as number | null"
        :placeholder="numericPlaceholder"
        size="small"
        class="w-full"
        @update:model-value="onValueUpdate"
    />

    <InputText
        v-else
        :model-value="(modelValue as string | null) ?? ''"
        type="text"
        :placeholder="textPlaceholder"
        size="small"
        class="w-full"
        @update:model-value="onValueUpdate"
    />
</template>

<script setup lang="ts">
import type { LookupOption } from '@zyd-labs/primevue-lookup';
import { LookupSelect } from '@zyd-labs/primevue-lookup';
import { DatePicker, InputNumber, InputText, MultiSelect, Select } from 'primevue';
import { computed } from 'vue';
import type { ColumnDef } from '../../types/datatable';
import { DATATABLE_LABELS } from '../../utils/labels';
import {
    getFilterConfig,
    getFilterOptionLabel,
    getFilterOptionValue,
    getFilterOptions,
    resolveFilterPlaceholder,
    resolveFilterType,
    resolveSelectOptions,
} from '../../utils/columnFilters';

const props = defineProps<{
    column: ColumnDef;
    modelValue: unknown;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: unknown): void;
    (e: 'selection-meta', options: LookupOption[]): void;
}>();

const filterType = computed(() => resolveFilterType(props.column));
const filterConfig = computed(() => getFilterConfig(props.column));
const filterOptions = computed(() => getFilterOptions(props.column));
const selectOptions = computed(() => resolveSelectOptions(props.column));
const optionLabel = computed(() => getFilterOptionLabel(props.column));
const optionValue = computed(() => getFilterOptionValue(props.column));
const maxSelectedLabels = computed(() => filterConfig.value?.maxSelectedLabels ?? 3);
const placeholder = computed(() => resolveFilterPlaceholder(props.column));
const numericPlaceholder = computed(() => resolveFilterPlaceholder(props.column, DATATABLE_LABELS.valuePlaceholder));
const textPlaceholder = computed(() => resolveFilterPlaceholder(props.column, DATATABLE_LABELS.searchPlaceholder));
const lookupEndpoint = computed(() => filterConfig.value?.lookupEndpoint ?? '');
const lookupParams = computed(() => filterConfig.value?.lookupParams);
const dataType = computed(() => props.column.dataType);

const onValueUpdate = (value: unknown): void => {
    emit('update:modelValue', value);
};

const onSelectionMeta = (options: LookupOption[]): void => {
    emit('selection-meta', options);
};
</script>
