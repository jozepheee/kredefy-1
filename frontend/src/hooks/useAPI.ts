'use client'

import { useState, useEffect, useCallback } from 'react'
import { AxiosError } from 'axios'

interface UseAPIOptions<T> {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    immediate?: boolean
}

interface UseAPIResult<T> {
    data: T | null
    error: Error | null
    isLoading: boolean
    execute: (...args: any[]) => Promise<T | null>
    reset: () => void
}

export function useAPI<T>(
    apiFn: (...args: any[]) => Promise<T>,
    options?: UseAPIOptions<T> | null
): UseAPIResult<T> {
    const safeOptions = options ?? {}
    const { onSuccess, onError, immediate = false } = safeOptions
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(immediate)

    const execute = useCallback(async (...args: any[]): Promise<T | null> => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await apiFn(...args)
            setData(result)
            onSuccess?.(result)
            return result
        } catch (err) {
            const error = err instanceof Error ? err : new Error('An error occurred')
            setError(error)
            onError?.(error)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [apiFn, onSuccess, onError])

    const reset = useCallback(() => {
        setData(null)
        setError(null)
        setIsLoading(false)
    }, [])

    useEffect(() => {
        if (immediate) {
            execute()
        }
    }, [immediate, execute])

    return { data, error, isLoading, execute, reset }
}

// Hook for paginated data
interface UsePaginatedAPIOptions<T> extends UseAPIOptions<T[]> {
    pageSize?: number
}

export function usePaginatedAPI<T>(
    apiFn: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
    options: UsePaginatedAPIOptions<T> = {}
) {
    const { pageSize = 10, onSuccess, onError } = options || {}
    const [items, setItems] = useState<T[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const loadPage = useCallback(async (pageNum: number) => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await apiFn(pageNum, pageSize)
            setItems(result.items)
            setTotal(result.total)
            setPage(pageNum)
            onSuccess?.(result.items)
        } catch (err) {
            const error = err instanceof Error ? err : new Error('An error occurred')
            setError(error)
            onError?.(error)
        } finally {
            setIsLoading(false)
        }
    }, [apiFn, pageSize, onSuccess, onError])

    const nextPage = useCallback(() => {
        if (page * pageSize < total) {
            loadPage(page + 1)
        }
    }, [page, pageSize, total, loadPage])

    const prevPage = useCallback(() => {
        if (page > 1) {
            loadPage(page - 1)
        }
    }, [page, loadPage])

    return {
        items,
        total,
        page,
        pageSize,
        isLoading,
        error,
        loadPage,
        nextPage,
        prevPage,
        hasNextPage: page * pageSize < total,
        hasPrevPage: page > 1,
    }
}

// Hook for mutation operations (POST, PUT, DELETE)
interface UseMutationOptions<T, TInput> {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
}

export function useMutation<T, TInput = any>(
    mutateFn: (input: TInput) => Promise<T>,
    options: UseMutationOptions<T, TInput> = {}
) {
    const { onSuccess, onError } = options || {}
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const mutate = useCallback(async (input: TInput): Promise<T | null> => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await mutateFn(input)
            setData(result)
            onSuccess?.(result)
            return result
        } catch (err) {
            const axiosError = err as AxiosError<{ detail?: string; message?: string }>
            const errorMessage =
                axiosError.response?.data?.detail ||
                axiosError.response?.data?.message ||
                axiosError.message ||
                'An error occurred'
            const error = new Error(errorMessage)
            setError(error)
            onError?.(error)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [mutateFn, onSuccess, onError])

    const reset = useCallback(() => {
        setData(null)
        setError(null)
        setIsLoading(false)
    }, [])

    return { data, error, isLoading, mutate, reset }
}

// Hook for real-time polling
export function usePolling<T>(
    apiFn: () => Promise<T>,
    intervalMs: number = 5000,
    options: { enabled?: boolean; onUpdate?: (data: T) => void } = {}
) {
    const { enabled = true, onUpdate } = options
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!enabled) return

        let isMounted = true

        const poll = async () => {
            try {
                const result = await apiFn()
                if (isMounted) {
                    setData(result)
                    onUpdate?.(result)
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Polling error'))
                }
            }
        }

        // Initial fetch
        poll()

        // Set up interval
        const interval = setInterval(poll, intervalMs)

        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [apiFn, intervalMs, enabled, onUpdate])

    return { data, error }
}
