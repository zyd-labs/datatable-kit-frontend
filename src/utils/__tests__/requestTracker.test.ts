import { describe, expect, it } from 'vitest';
import { createRequestTracker } from '../requestTracker';

describe('request tracker', () => {
    it('deduplicates in-flight requests and permits refresh after completion', () => {
        const tracker = createRequestTracker();
        const first = tracker.begin('page-1', { allowed: true });
        expect(first).not.toBeNull();
        expect(tracker.begin('page-1', { allowed: true })).toBeNull();
        first?.finish();
        expect(tracker.begin('page-1', { allowed: true })).not.toBeNull();
    });

    it('supersedes older pages and invalidates them on context reset or disposal', () => {
        const tracker = createRequestTracker();
        const context = new AbortController();
        const first = tracker.begin('page-1', { allowed: true, signal: context.signal });
        const second = tracker.begin('page-2', { allowed: true, signal: context.signal });
        expect(first?.signal.aborted).toBe(true);
        expect(first?.isCurrent()).toBe(false);
        expect(second?.isCurrent()).toBe(true);
        context.abort();
        expect(second?.isCurrent()).toBe(false);
        const next = tracker.begin('page-2', { allowed: true, signal: new AbortController().signal });
        expect(next?.isCurrent()).toBe(true);
        tracker.cancel();
        expect(next?.signal.aborted).toBe(true);
        expect(next?.isCurrent()).toBe(false);
    });

    it('does not start requests in an unauthorized or aborted context', () => {
        const tracker = createRequestTracker();
        const context = new AbortController();
        context.abort();
        expect(tracker.begin('page', { allowed: false })).toBeNull();
        expect(tracker.begin('page', { allowed: true, signal: context.signal })).toBeNull();
    });
});
