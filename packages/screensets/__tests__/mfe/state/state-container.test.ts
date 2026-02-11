/**
 * Tests for MFE State Container Factory
 *
 * Verifies:
 * - Independent store instances per MFE
 * - Store disposal on unmount
 * - Store isolation
 */

import { describe, it, expect, vi } from 'vitest';
import { DefaultMfeStateContainer } from '../../../src/mfe/state';

interface TestState {
  count: number;
  user: { name: string } | null;
}

describe('MFE State Container Factory', () => {
  describe('new DefaultMfeStateContainer', () => {
    it('should create a state container with initial state', () => {
      const initialState: TestState = { count: 0, user: null };
      const container = new DefaultMfeStateContainer({ initialState });

      expect(container.getState()).toEqual(initialState);
    });

    it('should create independent instances on each call', () => {
      const initialState: TestState = { count: 0, user: null };

      const container1 = new DefaultMfeStateContainer({ initialState });
      const container2 = new DefaultMfeStateContainer({ initialState });

      // Update container1
      container1.setState((state) => ({ ...state, count: 1 }));

      // container2 should remain unchanged (independent instance)
      expect(container1.getState().count).toBe(1);
      expect(container2.getState().count).toBe(0);
    });

    it('should support multiple MFE instances with same entry', () => {
      const initialState: TestState = { count: 0, user: null };

      // Simulate two instances of the same MFE entry
      const instanceA = new DefaultMfeStateContainer({ initialState });
      const instanceB = new DefaultMfeStateContainer({ initialState });

      // Update instance A
      instanceA.setState((state) => ({ ...state, count: 5 }));
      instanceA.setState((state) => ({
        ...state,
        user: { name: 'Alice' },
      }));

      // Update instance B
      instanceB.setState((state) => ({ ...state, count: 10 }));
      instanceB.setState((state) => ({
        ...state,
        user: { name: 'Bob' },
      }));

      // Verify complete isolation
      expect(instanceA.getState()).toEqual({
        count: 5,
        user: { name: 'Alice' },
      });
      expect(instanceB.getState()).toEqual({
        count: 10,
        user: { name: 'Bob' },
      });
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const initialState: TestState = { count: 0, user: null };
      const container = new DefaultMfeStateContainer({ initialState });

      expect(container.getState()).toBe(initialState);
    });

    it('should throw if container is disposed', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      container.dispose();

      expect(() => container.getState()).toThrow(
        'Cannot get state from disposed container'
      );
    });
  });

  describe('setState', () => {
    it('should update state with updater function', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      container.setState((state) => ({ ...state, count: 1 }));

      expect(container.getState().count).toBe(1);
    });

    it('should notify subscribers on state change', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener = vi.fn();
      container.subscribe(listener);

      container.setState((state) => ({ ...state, count: 1 }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ count: 1, user: null });
    });

    it('should not notify if state reference does not change', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener = vi.fn();
      container.subscribe(listener);

      // Return same state reference
      container.setState((state) => state);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle errors in listeners gracefully', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      container.subscribe(errorListener);
      container.subscribe(goodListener);

      // Should not throw, should log error
      expect(() =>
        container.setState((state) => ({ ...state, count: 1 }))
      ).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in state listener:',
        expect.any(Error)
      );
      expect(goodListener).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should throw if container is disposed', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      container.dispose();

      expect(() =>
        container.setState((state) => ({ ...state, count: 1 }))
      ).toThrow('Cannot set state on disposed container');
    });
  });

  describe('subscribe', () => {
    it('should call listener on state updates', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener = vi.fn();
      container.subscribe(listener);

      container.setState((state) => ({ ...state, count: 1 }));
      container.setState((state) => ({ ...state, count: 2 }));

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, { count: 1, user: null });
      expect(listener).toHaveBeenNthCalledWith(2, { count: 2, user: null });
    });

    it('should return unsubscribe function', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener = vi.fn();
      const unsubscribe = container.subscribe(listener);

      container.setState((state) => ({ ...state, count: 1 }));
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      container.setState((state) => ({ ...state, count: 2 }));
      expect(listener).toHaveBeenCalledTimes(1); // Not called after unsubscribe
    });

    it('should support multiple subscribers', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      container.subscribe(listener1);
      container.subscribe(listener2);
      container.subscribe(listener3);

      container.setState((state) => ({ ...state, count: 1 }));

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should allow unsubscribing individual listeners', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = container.subscribe(listener1);
      container.subscribe(listener2);

      unsubscribe1();

      container.setState((state) => ({ ...state, count: 1 }));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should throw if container is disposed', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      container.dispose();

      expect(() => container.subscribe(() => {})).toThrow(
        'Cannot subscribe to disposed container'
      );
    });
  });

  describe('dispose', () => {
    it('should clear all subscriptions', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener = vi.fn();
      container.subscribe(listener);

      container.dispose();

      // Attempting to update after dispose should throw
      expect(() =>
        container.setState((state) => ({ ...state, count: 1 }))
      ).toThrow();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should be idempotent', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      container.dispose();
      expect(() => container.dispose()).not.toThrow();
    });

    it('should clear state reference for garbage collection', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: { name: 'Test' } },
      });

      container.dispose();

      // State should no longer be accessible
      expect(() => container.getState()).toThrow();
    });
  });

  describe('disposed property', () => {
    it('should return false for active container', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      expect(container.disposed).toBe(false);
    });

    it('should return true for disposed container', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      container.dispose();

      expect(container.disposed).toBe(true);
    });
  });

  describe('Store isolation verification', () => {
    it('should verify each MFE instance has independent store', () => {
      // Simulate Chart MFE with two instances
      interface ChartState {
        data: number[];
        selectedPoint: number | null;
      }

      const chartInitialState: ChartState = {
        data: [],
        selectedPoint: null,
      };

      const chartInstance1 = new DefaultMfeStateContainer({
        initialState: chartInitialState,
      });
      const chartInstance2 = new DefaultMfeStateContainer({
        initialState: chartInitialState,
      });

      // Instance 1 updates
      chartInstance1.setState((state) => ({
        ...state,
        data: [1, 2, 3, 4, 5],
        selectedPoint: 2,
      }));

      // Instance 2 updates
      chartInstance2.setState((state) => ({
        ...state,
        data: [10, 20, 30],
        selectedPoint: 0,
      }));

      // Verify complete isolation
      expect(chartInstance1.getState()).toEqual({
        data: [1, 2, 3, 4, 5],
        selectedPoint: 2,
      });

      expect(chartInstance2.getState()).toEqual({
        data: [10, 20, 30],
        selectedPoint: 0,
      });

      // Cleanup
      chartInstance1.dispose();
      chartInstance2.dispose();

      expect(chartInstance1.disposed).toBe(true);
      expect(chartInstance2.disposed).toBe(true);
    });

    it('should verify disposal on unmount', () => {
      const container = new DefaultMfeStateContainer({
        initialState: { count: 0, user: null },
      });

      const listener = vi.fn();
      container.subscribe(listener);

      // Simulate unmount
      container.dispose();

      // All operations should now fail
      expect(() => container.getState()).toThrow();
      expect(() => container.setState((s) => s)).toThrow();
      expect(() => container.subscribe(() => {})).toThrow();

      // Listener should not be called
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
