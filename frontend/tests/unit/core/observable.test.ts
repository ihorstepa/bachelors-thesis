import { describe, expect, it, vi } from 'vitest'

import { Observable } from '@/core/general'

type TestEvents = {
    ping: []
    data: [value: string, count: number]
}

class TestObservable extends Observable<TestEvents> {
    ping() {
        this.emit('ping')
    }

    data(value: string, count: number) {
        this.emit('data', value, count)
    }
}

describe('core/Observable', () => {
    it('calls a registered listener when the event is emitted', () => {
        const obs = new TestObservable()
        const spy = vi.fn()
        obs.on('ping', spy)
        obs.ping()
        expect(spy).toHaveBeenCalledOnce()
    })

    it('passes event arguments through to the listener', () => {
        const obs = new TestObservable()
        const spy = vi.fn()
        obs.on('data', spy)
        obs.data('hello', 42)
        expect(spy).toHaveBeenCalledWith('hello', 42)
    })

    it('calls multiple listeners registered on the same event', () => {
        const obs = new TestObservable()
        const a = vi.fn()
        const b = vi.fn()
        obs.on('ping', a)
        obs.on('ping', b)
        obs.ping()
        expect(a).toHaveBeenCalledOnce()
        expect(b).toHaveBeenCalledOnce()
    })

    it('unregisters a listener via off()', () => {
        const obs = new TestObservable()
        const spy = vi.fn()
        obs.on('ping', spy)
        obs.off('ping', spy)
        obs.ping()
        expect(spy).not.toHaveBeenCalled()
    })

    it('unregisters a listener via the disposer returned by on()', () => {
        const obs = new TestObservable()
        const spy = vi.fn()
        const off = obs.on('ping', spy)
        off()
        obs.ping()
        expect(spy).not.toHaveBeenCalled()
    })

    it('only removes the targeted listener, leaving others intact', () => {
        const obs = new TestObservable()
        const a = vi.fn()
        const b = vi.fn()
        obs.on('ping', a)
        obs.on('ping', b)
        obs.off('ping', a)
        obs.ping()
        expect(a).not.toHaveBeenCalled()
        expect(b).toHaveBeenCalledOnce()
    })

    it('cleans up the observer set entry once all listeners are removed', () => {
        const obs = new TestObservable()
        const spy = vi.fn()
        obs.on('ping', spy)
        obs.off('ping', spy)
        const observers = (obs as unknown as { observers: Record<string, unknown> }).observers
        expect(observers['ping']).toBeUndefined()
    })

    it('does not throw when off() is called for an unregistered listener', () => {
        const obs = new TestObservable()
        expect(() => obs.off('ping', vi.fn())).not.toThrow()
    })

    it('silently ignores emits when no listeners are registered', () => {
        const obs = new TestObservable()
        expect(() => obs.ping()).not.toThrow()
    })

    it('does not invoke a listener that was removed before a second emit', () => {
        const obs = new TestObservable()
        const spy = vi.fn()
        obs.on('ping', spy)
        obs.ping()
        obs.off('ping', spy)
        obs.ping()
        expect(spy).toHaveBeenCalledOnce()
    })
})
