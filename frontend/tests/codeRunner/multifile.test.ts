import { describe, it, expect } from 'vitest'
import type { WorkerInMessage, WorkerOutMessage, ProjectFile } from '@/workers/codeRunner/shared'

function formatWorkerErrorEvent(e: ErrorEvent): string {
    const details = [
        `message=${e.message || 'Unknown worker error'}`,
        e.filename ? `file=${e.filename}` : '',
        e.lineno ? `line=${e.lineno}` : '',
        e.colno ? `column=${e.colno}` : '',
    ]
        .filter(Boolean)
        .join(', ')

    const nested =
        e.error instanceof Error ? (e.error.stack ?? `${e.error.name}: ${e.error.message}`) : String(e.error ?? '')
    return nested ? `${details}\n${nested}` : details
}

// Layout:
//   core/*.h              8 shared headers with small inline helpers and types
//   models/*.h            6 domain headers
//   policies/*.h          6 light configuration headers
//   schemas/*.h           5 support headers used by higher-level modules
//   stages/stage_N.*     12 implementation units
//   pipelines/pipeline_N.* 8 higher-level modules that compose several stages
//   main.cpp              entrypoint wiring the pipelines together
//
// This produces 66 files, including 21 compiled .cpp translation units,
// with a layered include graph that is closer to a normal C++ codebase.

const N_CORE_HEADERS = 8
const N_MODEL_HEADERS = 6
const N_POLICY_HEADERS = 6
const N_SCHEMA_HEADERS = 5
const N_STAGES = 12
const N_PIPELINES = 8

function generateProject(): ProjectFile[] {
    const files: ProjectFile[] = [
        {
            path: 'core/types.h',
            content: [`#pragma once`, ``, `struct Sample {`, `    double x;`, `    double y;`, `};`, ``].join('\n'),
        },
        {
            path: 'core/config.h',
            content: [
                `#pragma once`,
                ``,
                `inline constexpr double kBias = 0.75;`,
                `inline constexpr double kBlend = 0.35;`,
                ``,
            ].join('\n'),
        },
        {
            path: 'core/math_utils.h',
            content: [
                `#pragma once`,
                ``,
                `inline double mix(double lhs, double rhs, double ratio) {`,
                `    return lhs * (1.0 - ratio) + rhs * ratio;`,
                `}`,
                ``,
            ].join('\n'),
        },
        {
            path: 'core/metrics.h',
            content: [
                `#pragma once`,
                `#include "/project/core/types.h"`,
                ``,
                `inline double magnitude(const Sample& sample) {`,
                `    return sample.x * sample.x + sample.y * sample.y;`,
                `}`,
                ``,
            ].join('\n'),
        },
        {
            path: 'core/normalizer.h',
            content: [
                `#pragma once`,
                ``,
                `inline double normalize(double value) {`,
                `    return value / (1.0 + value);`,
                `}`,
                ``,
            ].join('\n'),
        },
        {
            path: 'core/weights.h',
            content: [
                `#pragma once`,
                ``,
                `inline double weight_for(int index) {`,
                `    return 1.0 + (index % 5) * 0.2;`,
                `}`,
                ``,
            ].join('\n'),
        },
        {
            path: 'core/tuning.h',
            content: [
                `#pragma once`,
                ``,
                `inline double tuned_offset(int stage) {`,
                `    return 0.15 * (stage + 1);`,
                `}`,
                ``,
            ].join('\n'),
        },
        {
            path: 'core/series.h',
            content: [
                `#pragma once`,
                `#include "/project/core/types.h"`,
                ``,
                `inline Sample make_sample(double seed) {`,
                `    return { seed, seed * 0.5 + 1.0 };`,
                `}`,
                ``,
            ].join('\n'),
        },
    ]

    for (let index = 0; index < N_MODEL_HEADERS; index++) {
        files.push({
            path: `models/model_${index}.h`,
            content: [
                `#pragma once`,
                `#include "/project/core/types.h"`,
                ``,
                `struct Model_${index} {`,
                `    Sample sample;`,
                `    double factor;`,
                `};`,
                ``,
            ].join('\n'),
        })
    }

    for (let index = 0; index < N_POLICY_HEADERS; index++) {
        files.push({
            path: `policies/policy_${index}.h`,
            content: [
                `#pragma once`,
                ``,
                `inline double policy_scale_${index}(double value) {`,
                `    return value * ${1 + index * 0.05};`,
                `}`,
                ``,
            ].join('\n'),
        })
    }

    for (let index = 0; index < N_SCHEMA_HEADERS; index++) {
        files.push({
            path: `schemas/schema_${index}.h`,
            content: [
                `#pragma once`,
                `#include "/project/models/model_${index % N_MODEL_HEADERS}.h"`,
                ``,
                `inline double schema_bias_${index}(const Model_${index % N_MODEL_HEADERS}& model) {`,
                `    return model.factor + ${index}.0 * 0.1;`,
                `}`,
                ``,
            ].join('\n'),
        })
    }

    for (let index = 0; index < N_STAGES; index++) {
        const modelIndex = index % N_MODEL_HEADERS
        const policyIndex = index % N_POLICY_HEADERS
        files.push({
            path: `stages/stage_${index}.h`,
            content: [
                `#pragma once`,
                `#include "/project/core/types.h"`,
                `#include "/project/core/math_utils.h"`,
                `#include "/project/models/model_${modelIndex}.h"`,
                `#include "/project/core/normalizer.h"`,
                ``,
                `double run_stage_${index}(const Sample& sample);`,
                ``,
            ].join('\n'),
        })

        files.push({
            path: `stages/stage_${index}.cpp`,
            content: [
                `#include "/project/stages/stage_${index}.h"`,
                `#include "/project/core/config.h"`,
                `#include "/project/core/metrics.h"`,
                `#include "/project/core/tuning.h"`,
                `#include "/project/core/weights.h"`,
                `#include "/project/policies/policy_${policyIndex}.h"`,
                ``,
                `double run_stage_${index}(const Sample& sample) {`,
                `    const double base = normalize(magnitude(sample) + tuned_offset(${index}));`,
                `    const double mixed = mix(base, sample.y + kBias, kBlend);`,
                `    const Model_${modelIndex} model = { sample, mixed };`,
                `    const double local = policy_scale_${policyIndex}(model.factor * weight_for(${index}));`,
                `    return local;`,
                `}`,
                ``,
            ].join('\n'),
        })
    }

    for (let index = 0; index < N_PIPELINES; index++) {
        const stageA = (index * 2) % N_STAGES
        const stageB = (stageA + 1) % N_STAGES
        const stageC = (stageA + 4) % N_STAGES
        const stageD = (stageA + 7) % N_STAGES
        const schemaIndex = index % N_SCHEMA_HEADERS
        const modelIndex = schemaIndex % N_MODEL_HEADERS

        files.push({
            path: `pipelines/pipeline_${index}.h`,
            content: [
                `#pragma once`,
                `#include "/project/schemas/schema_${schemaIndex}.h"`,
                `#include "/project/stages/stage_${stageA}.h"`,
                `#include "/project/stages/stage_${stageB}.h"`,
                `#include "/project/stages/stage_${stageC}.h"`,
                ``,
                `double run_pipeline_${index}(double seed);`,
                ``,
            ].join('\n'),
        })

        files.push({
            path: `pipelines/pipeline_${index}.cpp`,
            content: [
                `#include "/project/pipelines/pipeline_${index}.h"`,
                `#include "/project/core/series.h"`,
                `#include "/project/stages/stage_${stageD}.h"`,
                ``,
                `double run_pipeline_${index}(double seed) {`,
                `    const Sample sample = make_sample(seed + ${index}.0);`,
                `    const Model_${modelIndex} model = { sample, sample.x + sample.y };`,
                `    double total = 0.0;`,
                `    total += run_stage_${stageA}(sample);`,
                `    total += run_stage_${stageB}(sample) * 0.75;`,
                `    total += run_stage_${stageC}(sample) * 0.5;`,
                `    total += run_stage_${stageD}(sample) * 0.25;`,
                `    total += schema_bias_${schemaIndex}(model);`,
                `    return total;`,
                `}`,
                ``,
            ].join('\n'),
        })
    }

    const pipelineIncludes = Array.from(
        { length: N_PIPELINES },
        (_, index) => `#include "pipelines/pipeline_${index}.h"`,
    ).join('\n')
    const pipelineCalls = Array.from(
        { length: N_PIPELINES },
        (_, index) => `    total += run_pipeline_${index}(${index + 1}.0);`,
    ).join('\n')

    files.push({
        path: 'main.cpp',
        content: [
            `#include <cstdio>`,
            pipelineIncludes,
            ``,
            `int main() {`,
            `    double total = 0.0;`,
            pipelineCalls,
            `    std::printf("Result: %.2f\\n", total);`,
            `    return 0;`,
            `}`,
            ``,
        ].join('\n'),
    })

    return files
}

type RunResult = { ok: boolean; code: number; stdout: string; stderr: string }

function runProject(files: ProjectFile[], entrypoint: string): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../../src/workers/codeRunner/worker.ts', import.meta.url), {
            type: 'module',
        })
        let stdout = ''
        let stderr = ''
        let phase = 'loading toolchain'

        worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            const msg = event.data
            switch (msg.type) {
                case 'phase':
                    phase = msg.phase
                    break
                case 'stdout':
                    stdout += msg.text
                    break
                case 'stderr':
                    stderr += msg.text
                    break
                case 'done':
                    worker.terminate()
                    resolve({ ok: msg.ok, code: msg.code, stdout, stderr })
                    break
                case 'error':
                    worker.terminate()
                    reject(new Error(`Pipeline error during ${phase}: ${msg.message}\nstderr:\n${stderr}`))
                    break
            }
        }

        worker.onerror = (e: ErrorEvent) => {
            worker.terminate()
            reject(new Error(`Worker error during ${phase}: ${formatWorkerErrorEvent(e)}\nstderr:\n${stderr}`))
        }

        worker.postMessage({ type: 'start', files, entrypoint } satisfies WorkerInMessage)
    })
}

describe('multi-file C++ compilation', () => {
    it(`runs a ${N_CORE_HEADERS + N_MODEL_HEADERS + N_POLICY_HEADERS + N_SCHEMA_HEADERS + N_STAGES * 2 + N_PIPELINES * 2 + 1}-file project with realistic includes and 21 cpp files`, async () => {
        const files = generateProject()
        const result = await runProject(files, 'main.cpp')

        expect(result.ok, `Process failed (code ${result.code}).\nstderr:\n${result.stderr}`).toBe(true)
        expect(result.stdout).toMatch(/^Result: [\d.]+/)
    })
})
