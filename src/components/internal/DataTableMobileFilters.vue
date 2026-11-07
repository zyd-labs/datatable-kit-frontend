<template>
    <Drawer
        :visible="visible"
        position="bottom"
        class="!h-auto max-h-[90vh]"
        @update:visible="onVisibleUpdate"
    >
        <template #header>
            <span class="font-semibold">{{ labels.filters }}</span>
        </template>

        <div class="flex flex-col gap-4 pb-4">
            <div
                v-for="column in filterableColumns"
                :key="resolveFilterKey(column)"
                class="flex flex-col gap-2"
            >
                <label class="text-sm font-medium text-surface-700 dark:text-surface-200">
                    {{ column.header }}
                </label>

                <Select
                    v-if="shouldShowMatchModes(column)"
                    :model-value="getConstraint(column)?.matchMode"
                    :options="getMatchModeOptions(column)"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="labels.matchMode"
                    class="w-full"
                    appendTo="self"
                    @update:model-value="(value) => updateMatchMode(column, value)"
                />

                <Select
                    v-if="shouldShowOperator(column)"
                    :model-value="getFilter(column)?.operator ?? 'and'"
                    :options="operatorOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="labels.operator"
                    class="w-full"
                    appendTo="self"
                    @update:model-value="(value) => updateOperator(column, value)"
                />

                <DataTableFilterField
                    :column="column"
                    :model-value="getConstraint(column)?.value ?? null"
                    :match-mode="getConstraint(column)?.matchMode"
                    @update:model-value="(value) => updateValue(column, value)"
                    @selection-meta="(options) => onLookupSelectionMeta(column, options)"
                />
            </div>

            <div v-if="filterableColumns.length === 0" class="text-sm text-surface-500">
                Filtrelenebilir sütun bulunmuyor.
            </div>

        </div>

        <template #footer>
            <div class="flex flex-wrap gap-2">
                <Button
                    type="button"
                    :label="labels.clearFilters"
                    severity="danger"
                    text
                    class="min-h-11"
                    @click="emit('clear-filters')"
                />
                <Button
                    type="button"
                    :label="labels.close"
                    severity="secondary"
                    class="min-h-11 ms-auto"
                    @click="emit('update:visible', false)"
                />
            </div>
        </template>
    </Drawer>
</template>

<script setup lang="ts">
import type { LookupOption } from '@zyd-labs/primevue-lookup';
import { Button, Drawer, Select } from 'primevue';
import { computed } from 'vue';
import type { ColumnDef, DataTableFilter, FilterConstraint, MatchMode } from '../../types/datatable';
import {
    getAllowedMatchModes,
    getDefaultMatchMode,
    getFilterConfig,
    isFilterableColumn,
    resolveFilterKey,
    shouldShowMatchModes,
    shouldShowOperator,
} from '../../utils/columnFilters';
import { DATATABLE_LABELS } from '../../utils/labels';
import {
    adaptConstraintValueForMatchMode,
    getMatchModeOptions,
} from '../../utils/matchModeOptions';
import DataTableFilterField from './DataTableFilterField.vue';

const props = defineProps<{
    visible: boolean;
    columns: ColumnDef[];
    filters: Record<string, DataTableFilter>;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'update:filters', value: Record<string, DataTableFilter>): void;
    (e: 'clear-filters'): void;
}>();

const labels = DATATABLE_LABELS;

const filterableColumns = computed(() => props.columns.filter((column) => isFilterableColumn(column)));

const operatorOptions = [
    { label: labels.operatorAnd, value: 'and' },
    { label: labels.operatorOr, value: 'or' },
];

const onVisibleUpdate = (value: boolean): void => {
    emit('update:visible', value);
};

const getFilter = (column: ColumnDef): DataTableFilter | undefined => {
    return props.filters[resolveFilterKey(column)];
};

const getConstraint = (column: ColumnDef): FilterConstraint | undefined => {
    return getFilter(column)?.constraints?.[0];
};

const ensureFilter = (column: ColumnDef): DataTableFilter => {
    const existing = getFilter(column);
    const allowed = getAllowedMatchModes(column);
    const defaultMode = getDefaultMatchMode(column, getFilterConfig(column));

    if (existing) {
        const first = existing.constraints?.[0];
        const matchMode = first?.matchMode && allowed.includes(first.matchMode)
            ? first.matchMode
            : defaultMode;

        return {
            operator: existing.operator ?? 'and',
            constraints: existing.constraints?.length
                ? [{ ...first!, matchMode }]
                : [{ value: null, matchMode: defaultMode }],
        };
    }

    return {
        operator: getFilterConfig(column)?.operator || 'and',
        constraints: [{ value: null, matchMode: defaultMode }],
    };
};

const patchFilter = (column: ColumnDef, nextFilter: DataTableFilter): void => {
    const key = resolveFilterKey(column);
    emit('update:filters', {
        ...props.filters,
        [key]: nextFilter,
    });
};

const updateValue = (column: ColumnDef, value: unknown): void => {
    const filter = ensureFilter(column);
    const first = filter.constraints[0] ?? {
        value: null,
        matchMode: getDefaultMatchMode(column, getFilterConfig(column)),
    };

    filter.constraints[0] = {
        ...first,
        value,
    };

    patchFilter(column, filter);
};

const updateMatchMode = (column: ColumnDef, matchMode: MatchMode): void => {
    const filter = ensureFilter(column);
    const first = filter.constraints[0] ?? {
        value: null,
        matchMode,
    };

    filter.constraints[0] = {
        ...first,
        matchMode,
        value: adaptConstraintValueForMatchMode(first.matchMode, matchMode, first.value),
    };

    patchFilter(column, filter);
};

const updateOperator = (column: ColumnDef, operator: 'and' | 'or'): void => {
    const filter = ensureFilter(column);
    filter.operator = operator;
    patchFilter(column, filter);
};

const resolveLookupDisplayLabel = (column: ColumnDef, option: LookupOption): string => {
    const filterConfig = getFilterConfig(column);
    const labelKey = filterConfig?.lookupOptionLabel;
    if (!labelKey || labelKey === 'label') {
        return option.label;
    }

    const metaValue = option.meta?.[labelKey];
    if (metaValue !== undefined && metaValue !== null) {
        return String(metaValue);
    }

    return option.label;
};

const onLookupSelectionMeta = (column: ColumnDef, options: LookupOption[]): void => {
    const filter = ensureFilter(column);
    const first = filter.constraints[0] ?? {
        value: null,
        matchMode: getDefaultMatchMode(column, getFilterConfig(column)),
    };

    const labelsResolved = options.map((option) => resolveLookupDisplayLabel(column, option));
    const isMultiple = Array.isArray(first.value);

    filter.constraints[0] = {
        ...first,
        displayValue: isMultiple ? labelsResolved : (labelsResolved[0] ?? null),
    };

    patchFilter(column, filter);
};
</script>
