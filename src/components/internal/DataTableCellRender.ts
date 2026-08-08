import { defineComponent, h, type Component, type PropType, type VNode } from 'vue';

const isVNode = (value: unknown): value is VNode => {
    return Boolean(value && typeof value === 'object' && '__v_isVNode' in (value as Record<string, unknown>));
};

export const isRenderComponent = (value: unknown): value is Component => {
    return Boolean(
        value
        && typeof value === 'object'
        && (
            'template' in (value as Record<string, unknown>)
            || 'render' in (value as Record<string, unknown>)
            || 'setup' in (value as Record<string, unknown>)
        ),
    );
};

const DataTableCellRender = defineComponent({
    name: 'DataTableCellRender',
    props: {
        render: {
            type: [Function, Object] as PropType<((data: unknown) => string | VNode | number) | Component>,
            required: true,
        },
        data: {
            type: null as unknown as PropType<unknown>,
            required: true,
        },
    },
    setup(props) {
        return () => {
            if (isRenderComponent(props.render)) {
                return h(props.render, { data: props.data });
            }

            if (typeof props.render !== 'function') {
                return null;
            }

            const result = props.render(props.data);

            if (isVNode(result)) {
                return result;
            }

            if (result === null || result === undefined) {
                return null;
            }

            const content = typeof result === 'number' ? String(result) : String(result);

            return h('div', {
                innerHTML: content,
                class: 'render-content',
            });
        };
    },
});

export default DataTableCellRender;
