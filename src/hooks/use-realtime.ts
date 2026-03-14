import { useEffect, useRef } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  /** The Postgres table to subscribe to */
  table: string
  /** The schema (defaults to 'public') */
  schema?: string
  /** Which events to listen for (defaults to '*') */
  event?: PostgresEvent
  /** Optional filter expression, e.g. `form_id=eq.abc-123` */
  filter?: string
  /** Callback invoked when a matching change is received */
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void
}

/**
 * Subscribes to Supabase Realtime Postgres changes for a specific table.
 *
 * The subscription is automatically torn down when the component unmounts
 * or when the dependency values change.
 *
 * @example
 * ```ts
 * useRealtime({
 *   table: 'submissions',
 *   event: 'INSERT',
 *   filter: `form_id=eq.${formId}`,
 *   onPayload(payload) {
 *     console.log('New submission:', payload.new)
 *   },
 * })
 * ```
 */
export function useRealtime<T extends Record<string, unknown>>(
  options: UseRealtimeOptions<T>,
): void {
  const { table, schema = 'public', event = '*', filter, onPayload } = options

  // Keep latest callback ref to avoid re-subscribing on every render
  const callbackRef = useRef(onPayload)
  callbackRef.current = onPayload

  useEffect(() => {
    const channelName = `realtime:${schema}:${table}:${event}:${filter ?? 'all'}`

    const channelConfig: Parameters<RealtimeChannel['on']>[1] = {
      event,
      schema,
      table,
      ...(filter ? { filter } : {}),
    } as Parameters<RealtimeChannel['on']>[1]

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        (payload) => {
          callbackRef.current(payload as RealtimePostgresChangesPayload<T>)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [table, schema, event, filter])
}
