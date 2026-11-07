<template>
    <MultiSelect
        v-if="filterType === 'multi-select'"
        :model-value="multiSelectModelValue"
        :options="filterOptions"
        :optionLabel="optionLabel"
        :optionValue="optionValue"
        :maxSelectedLabels="maxSelectedLabels"
        filter
        :placeholder="placeholder"
        size="small"
        class="w-full"
        :appendTo="nestedOverlayAppendTo"
        @update:model-value="onMultiSelectUpdate"
    />

    <LookupSelect
        v-else-if="filterType === 'lookup' || filterType === 'lookup-multiple'"
        :model-value="modelValue"
        :endpoint="lookupEndpoint"
        :multiple="filterType === 'lookup-multiple'"
        :filters="lookupParams"
        :fetcher="lookupFetcher"
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
        :appendTo="nestedOverlayAppendTo"
        @update:model-value="onValueUpdate"
    />

    <DatePicker
        v-else-if="filterType === 'date-range' || (filterType === 'date' && effectiveMatchMode === 'between')"
        :model-value="modelValue as Date | Date[] | null"
        selectionMode="range"
        dateFormat="dd/mm/yy"
        :placeholder="placeholder"
        size="small"
        class="w-full"
        :appendTo="nestedOverlayAppendTo"
        @update:model-value="onValueUpdate"
    />

    <DatePicker
        v-else-if="filterType === 'date'"
        :model-value="modelValue as Date | null"
        dateFormat="dd/mm/yy"
        :placeholder="placeholder"
        size="small"
        class="w-full"
        :appendTo="nestedOverlayAppendTo"
        @update:model-value="onValueUpdate"
    />

    <div
        v-else-if="isNumeric && effectiveMatchMode === 'between'"
        class="flex w-full items-center gap-2"
    >
        <InputNumber
            :model-value="rangeStart"
            :placeholder="numericPlaceholder"
            size="small"
            class="w-full"
            v-bind="numericProps"
            @update:model-value="(value) => onRangeUpdate(0, value)"
        />
        <span class="shrink-0 text-surface-500">—</span>
        <InputNumber
            :model-value="rangeEnd"
            :placeholder="numericPlaceholder"
            size="small"
            class="w-full"
            v-bind="numericProps"
            @update:model-value="(value) => onRangeUpdate(1, value)"
        />
    </div>

    <InputNumber
        v-else-if="isNumeric"
        :model-value="modelValue as number | null"
        :placeholder="numericPlaceholder"
        size="small"
        class="w-full"
        v-bind="numericProps"
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
import type { ColumnDef, MatchMode } from '../../types/datatable';
import { DATATABLE_LABELS } from '../../utils/labels';
import {
    getDefaultMatchMode,
    getFilterConfig,
    getFilterOptionLabel,
    getFilterOptionValue,
    getFilterOptions,
    resolveFilterPlaceholder,
    resolveFilterType,
    resolveNestedFilterOverlayAppendTo,
    resolveSelectOptions,
} from '../../utils/columnFilters';

const props = defineProps<{
    column: ColumnDef;
    modelValue: unknown;
    matchMode?: MatchMode | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: unknown): void;
    (e: 'selection-meta', options: LookupOption[]): void;
}>();

const filterType = computed(() => resolveFilterType(props.column));
const nestedOverlayAppendTo = computed(() => resolveNestedFilterOverlayAppendTo(filterType.value));
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
const lookupFetcher = computed(() => filterConfig.value?.lookupFetcher);
const isNumeric = computed(() => filterType.value === 'numeric' || props.column.dataType === 'numeric');
const effectiveMatchMode = computed(
    () => props.matchMode ?? getDefaultMatchMode(props.column, filterConfig.value),
);

/** PrimeVue MultiSelect requires an array; coerce scalar controlled-filter values. */
const multiSelectModelValue = computed(() => {
    if (Array.isArray(props.modelValue)) {
        return props.modelValue;
    }

    if (props.modelValue == null || props.modelValue === '') {
        return null;
    }

    return [props.modelValue];
});

const numericProps = computed(() => {
    const mode = filterConfig.value?.numericMode ?? 'decimal';
    if (mode === 'currency') {
        return {
            mode: 'currency' as const,
            currency: filterConfig.value?.currency ?? 'TRY',
            locale: filterConfig.value?.locale ?? 'tr-TR',
            minFractionDigits: filterConfig.value?.minFractionDigits ?? 2,
            maxFractionDigits: filterConfig.value?.maxFractionDigits ?? 2,
        };
    }

    if (mode === 'integer') {
        return {
            minFractionDigits: 0,
            maxFractionDigits: 0,
        };
    }

    return {
        minFractionDigits: filterConfig.value?.minFractionDigits ?? 0,
        maxFractionDigits: filterConfig.value?.maxFractionDigits ?? 3,
    };
});

const rangeStart = computed(() => {
    if (!Array.isArray(props.modelValue)) {
        return null;
    }

    return (props.modelValue[0] as number | null | undefined) ?? null;
});

const rangeEnd = computed(() => {
    if (!Array.isArray(props.modelValue)) {
        return null;
    }

    return (props.modelValue[1] as number | null | undefined) ?? null;
});

const onValueUpdate = (value: unknown): void => {
    emit('update:modelValue', value);
};

const onMultiSelectUpdate = (value: unknown): void => {
    if (value == null || value === '') {
        emit('update:modelValue', null);

        return;
    }

    emit('update:modelValue', Array.isArray(value) ? value : [value]);
};

const onRangeUpdate = (index: 0 | 1, value: number | null): void => {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [null, null];
    current[index] = value;
    emit('update:modelValue', current);
};

const onSelectionMeta = (options: LookupOption[]): void => {
    emit('selection-meta', options);
};
</script>
