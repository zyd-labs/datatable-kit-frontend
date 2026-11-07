import { describe, expect, it } from 'vitest';
import { cleanFilters, isConstraintValueEmpty } from '../filterPayload';

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
