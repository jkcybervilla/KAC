export function nextSerial(items, field) {
  if (!items?.length) return 1;
  return Math.max(...items.map((i) => Number(i[field]) || 0)) + 1;
}

export function generateEmpId(slno) {
  return `KAC${String(slno).padStart(4, '0')}`;
}

export function findWorkerByAadhar(workers, aadhar) {
  return workers.find((w) => String(w.AADHAR_NO) === String(aadhar));
}
