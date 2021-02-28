import { FileResult } from "common/replayBrowser";
import os from "os";
import { Worker } from "worker_threads";

export const parseReplays = (files: string[], progressCallback: (count: number) => void) => {
  return new Promise<FileResult[]>((resolve, reject) => {
    const cores = os.cpus().length;
    const results = [] as FileResult[];
    const batchSize = Math.ceil(files.length / cores);
    let count = 0;
    for (let i = 0; i < cores; i++) {
      const start = i * batchSize;
      const end = Math.min(i * batchSize + batchSize, files.length);
      const worker = new Worker("./src/common/replayBrowser/stats.worker.js", {
        workerData: files.slice(start, end),
      });
      worker.on("message", (result) => {
        count++;
        progressCallback(count);
        if (result !== null) {
          results.push(result);
        }
        if (count === files.length) {
          resolve(results);
        }
      });
      worker.on("error", (err) => reject(err));
    }
  });
};
