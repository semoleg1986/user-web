import { computed, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

type LiveResourceOptions = {
  immediate?: boolean
  pollIntervalMs?: number
  pollWhenHidden?: boolean
  refetchOnFocus?: boolean
  refetchOnReconnect?: boolean
  enabled?: MaybeRefOrGetter<boolean>
}

type RefreshMode = 'load' | 'silent'

type RefreshOptions = {
  mode?: RefreshMode
}

type ErrorWithPayload = {
  statusMessage?: string
  data?: { detail?: string, message?: string }
  message?: string
}

export function useLiveResource<T>(
  loader: () => Promise<T>,
  options: LiveResourceOptions = {}
) {
  const data = ref<T | null>(null)
  const error = ref('')
  const lastError = ref<unknown | null>(null)
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const lastUpdatedAt = ref<Date | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const isEnabled = computed(() => {
    if (options.enabled === undefined) return true
    return Boolean(toValue(options.enabled))
  })

  const refresh = async ({ mode = 'load' }: RefreshOptions = {}) => {
    if (!isEnabled.value) return

    if (mode === 'silent') {
      isRefreshing.value = true
    } else {
      isLoading.value = true
      error.value = ''
    }

    try {
      data.value = await loader()
      lastUpdatedAt.value = new Date()
      if (mode === 'silent') {
        error.value = ''
      }
      lastError.value = null
    } catch (err: unknown) {
      const e = err as ErrorWithPayload
      lastError.value = err
      error.value = e.statusMessage || e.data?.detail || e.data?.message || e.message || 'Request failed'
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  const startPolling = () => {
    const interval = options.pollIntervalMs ?? 0
    if (!interval || interval <= 0) return
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => {
      if (!isEnabled.value) return
      if (!options.pollWhenHidden && document.visibilityState !== 'visible') return
      void refresh({ mode: 'silent' })
    }, interval)
  }

  const stopPolling = () => {
    if (!pollTimer) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  const onFocus = () => {
    if (!isEnabled.value) return
    void refresh({ mode: 'silent' })
  }

  const onReconnect = () => {
    if (!isEnabled.value) return
    void refresh({ mode: 'silent' })
  }

  onMounted(() => {
    if (options.immediate !== false) {
      void refresh()
    }
    startPolling()

    if (options.refetchOnFocus !== false) {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
    }
    if (options.refetchOnReconnect !== false) {
      window.addEventListener('online', onReconnect)
    }
  })

  onBeforeUnmount(() => {
    stopPolling()
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onFocus)
    window.removeEventListener('online', onReconnect)
  })

  watch(isEnabled, (value) => {
    if (!import.meta.client) return
    if (!value) return
    void refresh({ mode: 'silent' })
  })

  return {
    data,
    error,
    lastError,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    refresh
  }
}
