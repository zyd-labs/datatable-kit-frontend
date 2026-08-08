<template>
    <article
        class="rounded-lg border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900"
        :class="{ 'ring-1 ring-primary': isSelected && selectionMode === 'single' }"
    >
        <div class="flex items-start gap-3">
            <div v-if="selectionMode === 'multiple'" class="flex min-h-11 min-w-11 items-center justify-center" @click.stop>
                <Checkbox
                    :model-value="isSelected"
                    :binary="true"
                    :aria-label="selectionAriaLabel"
                    @update:model-value="onMultipleSelect"
                />
            </div>

            <button
                v-else-if="selectionMode === 'single'"
                type="button"
                class="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                :aria-label="selectionAriaLabel"
                :aria-pressed="isSelected"
                @click.stop="emit('toggle-selection')"
            >
                <span
                    class="flex h-5 w-5 items-center justify-center rounded-full border border-surface-400"
                    :class="isSelected ? 'border-primary bg-primary' : 'bg-transparent'"
                    aria-hidden="true"
                >
                    <span v-if="isSelected" class="h-2 w-2 rounded-full bg-surface-0" />
                </span>
            </button>

            <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                        <template v-if="hasCustomCard">
                            <slot name="mobile-card" :data="data" :columns="columns" />
                        </template>

                        <template v-else>
                            <div v-if="layout.titles.length || layout.badges.length" class="flex items-start justify-between gap-2">
                                <div class="min-w-0 flex-1">
                                    <div
                                        v-for="item in layout.titles"
                                        :key="`title-${item.column.field}`"
                                        class="text-base font-semibold text-surface-900 dark:text-surface-0"
                                    >
                                        <DataTableCellRender
                                            v-if="item.column.render"
                                            :render="item.column.render"
                                            :data="data"
                                        />
                                        <template v-else>{{ resolveDisplay(item.column) }}</template>
                                    </div>
                                </div>

                                <div v-if="layout.badges.length" class="flex shrink-0 flex-wrap justify-end gap-1">
                                    <div v-for="item in layout.badges" :key="`badge-${item.column.field}`">
                                        <DataTableCellRender
                                            v-if="item.column.render"
                                            :render="item.column.render"
                                            :data="data"
                                        />
                                        <span
                                            v-else-if="resolveDisplay(item.column)"
                                            class="inline-flex rounded-md bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-200"
                                        >
                                            {{ resolveDisplay(item.column) }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-for="item in layout.subtitles"
                                :key="`subtitle-${item.column.field}`"
                                class="mt-1 text-sm text-surface-600 dark:text-surface-300"
                            >
                                <DataTableCellRender
                                    v-if="item.column.render"
                                    :render="item.column.render"
                                    :data="data"
                                />
                                <template v-else>{{ resolveDisplay(item.column) }}</template>
                            </div>

                            <div v-if="visibleMetas.length" class="mt-3 flex flex-col gap-2">
                                <div
                                    v-for="item in visibleMetas"
                                    :key="`meta-${item.column.field}`"
                                    class="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 text-sm"
                                >
                                    <div class="text-surface-500 dark:text-surface-400">{{ item.label }}</div>
                                    <div class="min-w-0 text-surface-900 dark:text-surface-0">
                                        <DataTableCellRender
                                            v-if="item.column.render"
                                            :render="item.column.render"
                                            :data="data"
                                        />
                                        <template v-else>{{ resolveDisplay(item.column) }}</template>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="!layout.titles.length && !layout.subtitles.length && !layout.badges.length && !visibleMetas.length"
                                class="text-sm text-surface-500"
                            >
                                —
                            </div>
                        </template>
                    </div>
                </div>

                <div
                    v-if="hasExpansion || hasActions"
                    class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-200 pt-3 dark:border-surface-700"
                >
                    <Button
                        v-if="hasExpansion"
                        type="button"
                        :label="isExpanded ? labels.hideDetails : labels.showDetails"
                        :icon="isExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                        text
                        size="small"
                        class="min-h-11 px-2"
                        :aria-expanded="isExpanded"
                        @click.stop="emit('toggle-expand')"
                    />
                    <div v-else></div>

                    <div
                        v-if="hasActions"
                        class="flex flex-wrap items-center justify-end gap-2"
                        @click.stop
                    >
                        <slot name="actions" :data="data"></slot>
                    </div>
                </div>

                <div
                    v-if="hasExpansion && isExpanded"
                    class="mt-3 rounded-md border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800"
                >
                    <slot name="expansion" :data="data"></slot>
                </div>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { Button, Checkbox } from 'primevue';
import { computed, useSlots } from 'vue';
import type { ColumnDef } from '../../types/datatable';
import {
    buildMobileCardLayout,
    formatRawDisplayValue,
    getNestedValue,
    isDisplayValueEmpty,
    type MobileColumnItem,
} from '../../utils/mobileColumns';
import { DATATABLE_LABELS } from '../../utils/labels';
import DataTableCellRender from './DataTableCellRender';

const props = defineProps<{
    data: Record<string, unknown>;
    columns: ColumnDef[];
    selectionMode?: 'single' | 'multiple';
    isSelected: boolean;
    isExpanded: boolean;
    hasExpansion: boolean;
}>();

const emit = defineEmits<{
    (e: 'toggle-selection'): void;
    (e: 'toggle-expand'): void;
}>();

const slots = useSlots();
const labels = DATATABLE_LABELS;

const hasCustomCard = computed(() => Boolean(slots['mobile-card']));
const hasActions = computed(() => Boolean(slots.actions));
const layout = computed(() => buildMobileCardLayout(props.columns));

const resolveDisplay = (column: ColumnDef): string | null => {
    const raw = getNestedValue(props.data, column.field);
    return formatRawDisplayValue(raw);
};

const visibleMetas = computed(() => {
    return layout.value.metas.filter((item: MobileColumnItem) => {
        if (item.column.render) {
            return true;
        }

        const raw = getNestedValue(props.data, item.column.field);
        return !isDisplayValueEmpty(raw);
    });
});

const selectionAriaLabel = computed(() => {
    return props.isSelected ? 'Seçimi kaldır' : 'Satırı seç';
});

const onMultipleSelect = (): void => {
    emit('toggle-selection');
};
</script>
