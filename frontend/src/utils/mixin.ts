import type { AbstractClass, ConcreteClass, UnionToIntersection } from '@/utils/types'

type MergedClass<TClasses extends AbstractClass[]> = new (
    ...args: ConstructorParameters<TClasses[0]>
) => UnionToIntersection<InstanceType<TClasses[number]>>

function copyPrototypeChain(source: AbstractClass, target: AbstractClass): void {
    let proto = source.prototype
    while (proto && proto !== Object.prototype) {
        for (const name of Object.getOwnPropertyNames(proto)) {
            if (name === 'constructor') continue
            if (Object.getOwnPropertyDescriptor(target.prototype, name)) continue
            Object.defineProperty(
                target.prototype,
                name,
                Object.getOwnPropertyDescriptor(proto, name) ?? Object.create(null),
            )
        }
        proto = Object.getPrototypeOf(proto)
    }
}

function mixin<TClasses extends AbstractClass[]>(...classes: TClasses): MergedClass<TClasses> {
    const [Base, ...mixins] = classes
    mixins.forEach((mixin) => copyPrototypeChain(mixin, Base))
    return class extends (Base as unknown as ConcreteClass) {
        constructor(...args: unknown[]) {
            super(...(args as []))
            mixins.forEach((mixin) => {
                Object.assign(this, new (mixin as ConcreteClass)())
            })
        }
    } as unknown as MergedClass<TClasses>
}

export default mixin
