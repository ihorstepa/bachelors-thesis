import { describe, expect, it } from 'vitest'

import mixin from '@/utils/mixin'

describe('utils/mixin', () => {
    it('produces an instance with methods from both the base class and the mixin', () => {
        class A {
            greet() {
                return 'hello from A'
            }
        }
        class B {
            wave() {
                return 'wave from B'
            }
        }
        const AB = mixin(A, B)
        const instance = new AB()
        expect(instance.greet()).toBe('hello from A')
        expect(instance.wave()).toBe('wave from B')
    })

    it('does not overwrite a base-class method with an identically-named mixin method', () => {
        class A {
            identify() {
                return 'A'
            }
        }
        class B {
            identify() {
                return 'B'
            }
        }
        const AB = mixin(A, B)
        expect(new AB().identify()).toBe('A')
    })

    it('the resulting class is an instanceof the base class', () => {
        class Base {
            hello() {
                return 'hi'
            }
        }
        class Extra {
            extra() {
                return 'extra'
            }
        }
        const Mixed = mixin(Base, Extra)
        expect(new Mixed()).toBeInstanceOf(Base)
    })

    it('supports three-way merges', () => {
        class A {
            a() {
                return 'a'
            }
        }
        class B {
            b() {
                return 'b'
            }
        }
        class C {
            c() {
                return 'c'
            }
        }
        const ABC = mixin(A, B, C)
        const inst = new ABC()
        expect(inst.a()).toBe('a')
        expect(inst.b()).toBe('b')
        expect(inst.c()).toBe('c')
    })

    it('forwards constructor arguments to the base class', () => {
        class Counter {
            constructor(public value: number) {}
            inc() {
                return ++this.value
            }
        }
        class Logger {
            log() {
                return 'log'
            }
        }
        const CounterLogger = mixin(Counter as unknown as abstract new (...args: unknown[]) => Counter, Logger)
        const inst = new CounterLogger(10) as Counter & Logger
        expect(inst.value).toBe(10)
        expect(inst.inc()).toBe(11)
        expect(inst.log()).toBe('log')
    })

    it('throws when called without a base class', () => {
        const callWithoutClasses = mixin as unknown as (...classes: unknown[]) => unknown

        expect(() => callWithoutClasses()).toThrow()
    })
})
