import { load } from "../utils/storage.js";

// A worker pool, not a fixed-window batcher. The previous version sliced items
// into groups of `concurrency` and awaited each group fully before starting the
// next, so every group ran at the speed of its slowest member and left the other
// slots idle. Here each worker takes the next item as soon as it is free, which
// keeps `concurrency` requests genuinely in flight. Results stay in input order.
export const parallelBatch = async (items, asyncFn, concurrency = 5) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await asyncFn(items[index], index, items);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
};

export const getSemestersData = async () => {
  const semestersData = await load("semestersData");
  
  if (!semestersData || semestersData.length === 0) {
    return [
      { value: "all", label: "All Semesters" },
      { value: "1", label: "Semester 1" },
      { value: "2", label: "Semester 2" },
      { value: "3", label: "Semester 3" },
      { value: "4", label: "Semester 4" },
      { value: "5", label: "Semester 5" },
      { value: "6", label: "Semester 6" },
      { value: "7", label: "Semester 7" },
      { value: "8", label: "Semester 8" }
    ];
  }

  const semesters = [{ value: "all", label: "All Semesters" }];
  semestersData.forEach(sem => {
    semesters.push({
      value: String(sem.number),
      label: `Semester ${sem.number}`
    });
  });
  
  return semesters;
};

