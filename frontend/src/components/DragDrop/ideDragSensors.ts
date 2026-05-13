import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'

// Require a small pointer movement before drag starts to avoid trackpad tap jitter.
export const ideDragSensors = [
    PointerSensor.configure({
        activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })],
    }),
    KeyboardSensor,
]
