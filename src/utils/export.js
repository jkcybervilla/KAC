import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(rows, columns, filename = 'export') {
  if (!rows?.length) {
    alert('No data to export');
    return;
  }
  const headers = columns.map((c) => c.headerName || c.field);
  const fields = columns.map((c) => c.field).filter(Boolean);
  const data = rows.map((row) =>
    fields.reduce((acc, field, i) => {
      acc[headers[i]] = row[field] ?? '';
      return acc;
    }, {})
  );
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPdf(rows, columns, title = 'Report', filename = 'export') {
  if (!rows?.length) {
    alert('No data to export');
    return;
  }
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  const fields = columns.filter((c) => c.field).map((c) => c.field);
  const head = [columns.filter((c) => c.field).map((c) => c.headerName || c.field)];
  const body = rows.map((row) => fields.map((f) => String(row[f] ?? '')));
  autoTable(doc, {
    head,
    body,
    startY: 22,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 85, 255] },
  });
  doc.save(`${filename}.pdf`);
}

export function getExportColumns(columnDefs) {
  const flat = [];
  columnDefs.forEach((col) => {
    if (col.children) flat.push(...col.children);
    else if (col.field) flat.push(col);
  });
  return flat;
}
