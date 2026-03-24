export type NullableString = string | null
export type MaybePromise<T> = T | Promise<T>

export type ConcreteClass<T = {}> = new (...args: any[]) => T
export type AbstractClass<T = {}> = abstract new (...args: any[]) => T

export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never
