import { describe, expect, it } from 'vitest';
import {
    cleanFilters,
    isConstraintValueEmpty,
    parseFilterDate,
    toDatePickerModel,
} from '../filterPayload';

describe('filterPayload date picker coercion', () => {
    it('parses YYYY-MM-DD strings as local Date instances', () => {
        const date = parseFilterDate('2026-11-07');
        expect(date).toBeInstanceOf(Date);
        expect(date?.getFullYear()).toBe(2026);
        expect(date?.getMonth()).toBe(10);
        expect(date?.getDate()).toBe(7);
    });

    it('keeps Date instances and nulls empty values', () => {
        const existing = new Date(2026, 0, 15);
        expect(parseFilterDate(existing)).toBe(existing);
        expect(parseFilterDate(null)).toBeNull();
        expect(parseFilterDate('')).toBeNull();
        expect(parseFilterDate('not-a-date')).toBeNull();
    });

    it('maps single and range values for DatePicker model-value', () => {
        const single = toDatePickerModel('2026-11-07');
        expect(single).toBeInstanceOf(Date);

        const range = toDatePickerModel(['2026-11-01', '2026-11-07']) as Date[];
        expect(range).toHaveLength(2);
        expect(range[0]?.getDate()).toBe(1);
        expect(range[1]?.getDate()).toBe(7);
    });
});

describe('filterPayload value emptiness', () => {
    it('treats 0 and false as meaningful values', () => {
        expect(isConstraintValueEmpty(0)).toBe(false);
        expect(isConstraintValueEmpty(false)).toBe(false);
        expect(isConstraintValueEmpty(null)).toBe(true);
        expect(isConstraintValueEmpty('')).toBe(true);
    });

    it('drops incomplete between constraints', () => {
        const cleaned = cleanFilters({
            amount: {
                operator: 'and',
                constraints: [
                    { matchMode: 'between', value: [10, null] },
                ],
            },
            paid: {
                operator: 'and',
                constraints: [
                    { matchMode: 'equals', value: 0 },
                ],
            },
        });

        expect(cleaned.amount).toBeUndefined();
        expect(cleaned.paid?.constraints[0]?.value).toBe(0);
    });

    it('keeps complete between ranges', () => {
        const cleaned = cleanFilters({
            amount: {
                operator: 'and',
                constraints: [
                    { matchMode: 'between', value: [10, 20] },
                ],
            },
        });

        expect(cleaned.amount?.constraints[0]?.value).toEqual([10, 20]);
    });
});
