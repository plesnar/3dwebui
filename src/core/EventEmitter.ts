/**
 * Minimal typed event emitter.
 *
 * `TEventMap` maps event names to their payload types. Listeners are stored per
 * event type and dispatched synchronously. The listener set is copied before
 * dispatch so handlers may safely add/remove listeners (including themselves)
 * during emission. Individual listener errors are isolated so one throwing
 * handler does not prevent the others from running.
 */
export class EventEmitter<TEventMap extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof TEventMap, Set<(event: never) => void>>()

  /**
   * Registers `listener` for `type`. Returns a disposer that removes it.
   */
  public on<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): () => void {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(listener as (event: never) => void)
    return () => this.off(type, listener)
  }

  /**
   * Registers `listener` for `type`, removing it after the first invocation.
   * Returns a disposer that cancels it before it fires.
   */
  public once<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): () => void {
    const wrapper = (event: TEventMap[K]): void => {
      this.off(type, wrapper)
      listener(event)
    }
    return this.on(type, wrapper)
  }

  /**
   * Removes a previously registered `listener` for `type`.
   */
  public off<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void {
    const set = this.listeners.get(type)
    if (!set) {
      return
    }
    set.delete(listener as (event: never) => void)
    if (set.size === 0) {
      this.listeners.delete(type)
    }
  }

  /**
   * Dispatches `event` to all listeners registered for `type`.
   */
  public emit<K extends keyof TEventMap>(type: K, event: TEventMap[K]): void {
    const set = this.listeners.get(type)
    if (!set || set.size === 0) {
      return
    }

    for (const listener of Array.from(set)) {
      try {
        ;(listener as (event: TEventMap[K]) => void)(event)
      } catch (error) {
        console.warn(`EventEmitter listener for "${String(type)}" threw:`, error)
      }
    }
  }

  /**
   * Returns whether any listener is registered for `type`.
   */
  public hasListeners<K extends keyof TEventMap>(type: K): boolean {
    const set = this.listeners.get(type)
    return set !== undefined && set.size > 0
  }

  /**
   * Removes all listeners for `type`, or every listener when `type` is omitted.
   */
  public removeAllListeners<K extends keyof TEventMap>(type?: K): void {
    if (type === undefined) {
      this.listeners.clear()
      return
    }
    this.listeners.delete(type)
  }
}
