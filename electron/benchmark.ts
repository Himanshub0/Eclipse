import { app, BrowserWindow } from 'electron';
import type { BrowserViewManager } from './browser-view';
import { performance } from 'perf_hooks';

export interface ProcessMetricInfo {
  pid: number;
  type: string;
  cpuPercent: number;
  memoryWorkingSetMB: number;
}

export interface BenchmarkStageResult {
  stage: string;
  tabCount: number;
  totalMemoryMB: number;
  totalCpuPercent: number;
  processes: ProcessMetricInfo[];
}

export interface BenchmarkReport {
  timing: {
    coldStartTimeMs: number;
    readyTimeMs: number;
    firstPageLoadTimeMs: number;
  };
  stages: {
    idle1Tab: BenchmarkStageResult;
    tabs5: BenchmarkStageResult;
    tabs10: BenchmarkStageResult;
    afterCloseBackTo1Tab: BenchmarkStageResult;
  };
  tabSwitching: {
    iterations: number;
    totalTimeMs: number;
    averageSwitchMs: number;
  };
  leakAssessment: {
    initial1TabMemMB: number;
    postClose1TabMemMB: number;
    retainedMemoryDeltaMB: number;
    orphanedProcessCount: number;
  };
}

function captureProcessMetrics(): { totalMemoryMB: number; totalCpuPercent: number; processes: ProcessMetricInfo[] } {
  const metrics = app.getAppMetrics();
  let totalMem = 0;
  let totalCpu = 0;
  const list: ProcessMetricInfo[] = [];

  for (const m of metrics) {
    const memMB = Math.round((m.memory.workingSetSize || 0) / 1024);
    totalMem += memMB;
    totalCpu += m.cpu.percentCPUUsage;
    list.push({
      pid: m.pid,
      type: m.type,
      cpuPercent: parseFloat(m.cpu.percentCPUUsage.toFixed(1)),
      memoryWorkingSetMB: memMB,
    });
  }

  return {
    totalMemoryMB: totalMem,
    totalCpuPercent: parseFloat(totalCpu.toFixed(1)),
    processes: list,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runPerformanceBenchmark(
  startTime: number,
  readyTime: number,
  firstPageLoadTime: number,
  mgr: BrowserViewManager,
  win: BrowserWindow
): Promise<void> {
  console.log('\n[BENCHMARK] === Starting Eclipse Browser Performance Benchmark ===\n');

  const coldStartTimeMs = Math.round(readyTime - startTime);
  const firstPageLoadTimeMs = Math.round(firstPageLoadTime - startTime);

  console.log(`[BENCHMARK] Cold Start to Ready: ${coldStartTimeMs} ms`);
  console.log(`[BENCHMARK] Cold Start to First Page Loaded: ${firstPageLoadTimeMs} ms`);

  // Stage 1: Settle at 1 Tab
  console.log('[BENCHMARK] Settling 1 tab idle...');
  await sleep(2000);
  const idle1 = captureProcessMetrics();
  console.log(`[BENCHMARK] Stage 1 (1 Tab Idle): ${idle1.totalMemoryMB} MB, CPU: ${idle1.totalCpuPercent}%`);

  // Stage 2: Open 4 more tabs (total 5 tabs)
  console.log('[BENCHMARK] Creating 4 additional tabs (5 total)...');
  const createdTabIds: string[] = [];
  for (let i = 2; i <= 5; i++) {
    const tabUrl = `data:text/html,<html><head><title>Tab ${i}</title></head><body><h1>Benchmark Tab ${i}</h1><p>Performance test content</p></body></html>`;
    const id = mgr.createTab(tabUrl);
    createdTabIds.push(id);
    await sleep(250);
  }
  await sleep(1500);
  const stage5 = captureProcessMetrics();
  console.log(`[BENCHMARK] Stage 2 (5 Tabs): ${stage5.totalMemoryMB} MB, CPU: ${stage5.totalCpuPercent}%`);

  // Stage 3: Open 5 more tabs (total 10 tabs)
  console.log('[BENCHMARK] Creating 5 additional tabs (10 total)...');
  for (let i = 6; i <= 10; i++) {
    const tabUrl = `data:text/html,<html><head><title>Tab ${i}</title></head><body><h1>Benchmark Tab ${i}</h1><p>Performance test content</p></body></html>`;
    const id = mgr.createTab(tabUrl);
    createdTabIds.push(id);
    await sleep(250);
  }
  await sleep(1500);
  const stage10 = captureProcessMetrics();
  console.log(`[BENCHMARK] Stage 3 (10 Tabs): ${stage10.totalMemoryMB} MB, CPU: ${stage10.totalCpuPercent}%`);

  // Stage 4: Measure tab switching latency
  console.log('[BENCHMARK] Measuring tab-switch responsiveness (10 switches)...');
  const state = mgr.getAppState();
  const allTabIds = state.tabs.map((t) => t.id);
  const switchStart = performance.now();
  for (let i = 0; i < 10; i++) {
    const targetId = allTabIds[i % allTabIds.length];
    mgr.switchTab(targetId);
  }
  const switchTotalMs = performance.now() - switchStart;
  const avgSwitchMs = parseFloat((switchTotalMs / 10).toFixed(2));
  console.log(`[BENCHMARK] Tab Switch Latency: average ${avgSwitchMs} ms per switch (total ${Math.round(switchTotalMs)} ms)`);

  // Stage 5: Close the 9 created tabs, return to 1 tab
  console.log('[BENCHMARK] Closing 9 tabs to test resource cleanup...');
  for (const id of createdTabIds) {
    mgr.closeTab(id);
  }
  await sleep(2000);
  const postClose = captureProcessMetrics();
  console.log(`[BENCHMARK] Stage 5 (Post-Close 1 Tab): ${postClose.totalMemoryMB} MB, CPU: ${postClose.totalCpuPercent}%`);

  const retainedDelta = postClose.totalMemoryMB - idle1.totalMemoryMB;
  const processDelta = postClose.processes.length - idle1.processes.length;

  const report: BenchmarkReport = {
    timing: {
      coldStartTimeMs,
      readyTimeMs: Math.round(readyTime - startTime),
      firstPageLoadTimeMs,
    },
    stages: {
      idle1Tab: { stage: '1 Tab Idle', tabCount: 1, ...idle1 },
      tabs5: { stage: '5 Tabs Active', tabCount: 5, ...stage5 },
      tabs10: { stage: '10 Tabs Active', tabCount: 10, ...stage10 },
      afterCloseBackTo1Tab: { stage: 'Post-Close (Back to 1 Tab)', tabCount: 1, ...postClose },
    },
    tabSwitching: {
      iterations: 10,
      totalTimeMs: parseFloat(switchTotalMs.toFixed(2)),
      averageSwitchMs: avgSwitchMs,
    },
    leakAssessment: {
      initial1TabMemMB: idle1.totalMemoryMB,
      postClose1TabMemMB: postClose.totalMemoryMB,
      retainedMemoryDeltaMB: retainedDelta,
      orphanedProcessCount: Math.max(0, processDelta),
    },
  };

  console.log('\n[BENCHMARK_RESULT_JSON_START]');
  console.log(JSON.stringify(report, null, 2));
  console.log('[BENCHMARK_RESULT_JSON_END]\n');

  console.log('[BENCHMARK] Exiting benchmark cleanly.');
  app.exit(0);
}
