import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useErrorStore } from '../../src/stores/errorStore'
import { act } from 'react'

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('../../src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

describe('errorStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the entire store state before each test
    useErrorStore.setState({
      // The errorStore doesn't maintain internal state, it just calls toast
    });
  })

  describe('showError', () => {
    it('should show error toast', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showError('Test error message')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Test error message'
      });
    })

    it('should show error toast with custom title', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showError('Custom error', 'Custom Title')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Custom Title',
        description: 'Custom error'
      });
    })
  })

  describe('showSuccess', () => {
    it('should show success toast', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showSuccess('Test success message')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'default',
        title: 'Success',
        description: 'Test success message'
      });
    })

    it('should show success toast with custom title', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showSuccess('Custom success', 'Custom Title')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'default',
        title: 'Custom Title',
        description: 'Custom success'
      });
    })
  })

  describe('showWarning', () => {
    it('should show warning toast', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showWarning('Test warning message')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Warning',
        description: 'Test warning message'
      });
    })

    it('should show warning toast with custom title', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showWarning('Custom warning', 'Custom Title')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Custom Title',
        description: 'Custom warning'
      });
    })
  })

  describe('showInfo', () => {
    it('should show info toast', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showInfo('Test info message')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'default',
        title: 'Info',
        description: 'Test info message'
      });
    })

    it('should show info toast with custom title', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showInfo('Custom info', 'Custom Title')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'default',
        title: 'Custom Title',
        description: 'Custom info'
      });
    })
  })

  describe('handleApiError', () => {
    it('should handle API error with message', async () => {
      const { result } = renderHook(() => useErrorStore());

      const error = new Error('API Error Message');

      await act(async () => {
        result.current.handleApiError(error, 'API Operation Failed')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'API Operation Failed',
        description: 'API Error Message'
      });
    })

    it('should handle API error without custom title', async () => {
      const { result } = renderHook(() => useErrorStore());

      const error = new Error('Network Error');

      await act(async () => {
        result.current.handleApiError(error)
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Network Error'
      });
    })

    it('should handle API error with custom context', async () => {
      const { result } = renderHook(() => useErrorStore());

      const error = new Error('Database connection failed');

      await act(async () => {
        result.current.handleApiError(error, 'Database Operation')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Database Operation',
        description: 'Database connection failed'
      });
    })
  })

  describe('State Persistence', () => {
    it('persists across store instances', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showError('Persistent error')
      });

      // Create new store instance
      const { result: newResult } = renderHook(() => useErrorStore());

      // The store doesn't maintain state, but the toast should still work
      await act(async () => {
        newResult.current.showSuccess('New success')
      });

      expect(mockToast).toHaveBeenCalledTimes(2);
      expect(mockToast).toHaveBeenNthCalledWith(1, {
        variant: 'destructive',
        title: 'Error',
        description: 'Persistent error'
      });
      expect(mockToast).toHaveBeenNthCalledWith(2, {
        variant: 'default',
        title: 'Success',
        description: 'New success'
      });
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple rapid toast calls', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showError('Error 1')
        result.current.showSuccess('Success 1')
        result.current.showWarning('Warning 1')
        result.current.showInfo('Info 1')
      });

      expect(mockToast).toHaveBeenCalledTimes(4);
      expect(mockToast).toHaveBeenNthCalledWith(1, {
        variant: 'destructive',
        title: 'Error',
        description: 'Error 1'
      });
      expect(mockToast).toHaveBeenNthCalledWith(2, {
        variant: 'default',
        title: 'Success',
        description: 'Success 1'
      });
      expect(mockToast).toHaveBeenNthCalledWith(3, {
        variant: 'destructive',
        title: 'Warning',
        description: 'Warning 1'
      });
      expect(mockToast).toHaveBeenNthCalledWith(4, {
        variant: 'default',
        title: 'Info',
        description: 'Info 1'
      });
    })

    it('handles empty messages', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showError('')
        result.current.showSuccess('')
      });

      expect(mockToast).toHaveBeenCalledTimes(2);
      expect(mockToast).toHaveBeenNthCalledWith(1, {
        variant: 'destructive',
        title: 'Error',
        description: ''
      });
      expect(mockToast).toHaveBeenNthCalledWith(2, {
        variant: 'default',
        title: 'Success',
        description: ''
      });
    })

    it('handles API error with empty message', async () => {
      const { result } = renderHook(() => useErrorStore());

      const error = new Error('');

      await act(async () => {
        result.current.handleApiError(error, 'Empty Error')
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Empty Error',
        description: ''
      });
    })
  })

  describe('Integration Scenarios', () => {
    it('handles complete error workflow', async () => {
      const { result } = renderHook(() => useErrorStore());

      // 1. Show initial info
      await act(async () => {
        result.current.showInfo('Starting operation')
      });

      // 2. Show success for partial completion
      await act(async () => {
        result.current.showSuccess('Step 1 completed')
      });

      // 3. Show warning for potential issue
      await act(async () => {
        result.current.showWarning('Step 2 has warnings')
      });

      // 4. Handle API error
      const error = new Error('Step 3 failed');
      await act(async () => {
        result.current.handleApiError(error, 'Operation Failed')
      });

      // 5. Show final error
      await act(async () => {
        result.current.showError('Operation could not be completed')
      });

      expect(mockToast).toHaveBeenCalledTimes(5);
      expect(mockToast).toHaveBeenNthCalledWith(1, {
        variant: 'default',
        title: 'Info',
        description: 'Starting operation'
      });
      expect(mockToast).toHaveBeenNthCalledWith(2, {
        variant: 'default',
        title: 'Success',
        description: 'Step 1 completed'
      });
      expect(mockToast).toHaveBeenNthCalledWith(3, {
        variant: 'destructive',
        title: 'Warning',
        description: 'Step 2 has warnings'
      });
      expect(mockToast).toHaveBeenNthCalledWith(4, {
        variant: 'destructive',
        title: 'Operation Failed',
        description: 'Step 3 failed'
      });
      expect(mockToast).toHaveBeenNthCalledWith(5, {
        variant: 'destructive',
        title: 'Error',
        description: 'Operation could not be completed'
      });
    })

    it('handles different error types in sequence', async () => {
      const { result } = renderHook(() => useErrorStore());

      await act(async () => {
        result.current.showError('Critical error')
        result.current.showWarning('Non-critical warning')
        result.current.showInfo('Informational message')
        result.current.showSuccess('Recovery successful')
      });

      expect(mockToast).toHaveBeenCalledTimes(4);
      expect(mockToast).toHaveBeenNthCalledWith(1, {
        variant: 'destructive',
        title: 'Error',
        description: 'Critical error'
      });
      expect(mockToast).toHaveBeenNthCalledWith(2, {
        variant: 'destructive',
        title: 'Warning',
        description: 'Non-critical warning'
      });
      expect(mockToast).toHaveBeenNthCalledWith(3, {
        variant: 'default',
        title: 'Info',
        description: 'Informational message'
      });
      expect(mockToast).toHaveBeenNthCalledWith(4, {
        variant: 'default',
        title: 'Success',
        description: 'Recovery successful'
      });
    })
  })
})
