const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function getBatchId(month, year) {
  return `${MONTHS[month - 1]}_${year}`;
}

export function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

export function countPresent(days, maxDay) {
  let count = 0;
  for (let d = 1; d <= maxDay; d++) {
    if (days[String(d)] === 'P') count++;
  }
  return count;
}

export function defaultDayMap(daysInMonth, value = 'P') {
  return Object.fromEntries(
    Array.from({ length: daysInMonth }, (_, i) => [String(i + 1), value])
  );
}

export { MONTHS };
