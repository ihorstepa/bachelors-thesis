export type NullableString = string | null
export type MaybePromise<T> = T | Promise<T>

export type ConcreteClass<T extends object = object> = new (...args: unknown[]) => T
export type AbstractClass<T extends object = object> = abstract new (...args: unknown[]) => T

export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never
