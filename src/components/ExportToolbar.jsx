import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { pageStyles as s } from '../styles/pageStyles';
import { exportToExcel, exportToPdf, getExportColumns } from '../utils/export';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ExportToolbar = ({ rows, columnDefs, title, filename, fullMonthRows, month, year, projectName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cols = getExportColumns(columnDefs);

  const monthName = month
    ? new Date(2024, month - 1).toLocaleString('en', { month: 'long' })
    : '';

  const handleExcel = () => {
    setOpen(false);
    if (fullMonthRows?.length && month && year && projectName) {
      const firstRow = fullMonthRows[0];
      const dayKeys = Object.keys(firstRow).filter((k) => /^\d+$/.test(k));

      const colHeaders = [
        'SL', 'EMP ID', 'NAME', 'FATHER NAME', 'REFFERENCE',
        'JOIN DATE', 'CLOSING DATE',
        ...dayKeys,
        'TOTAL'
      ];

      const dataRows = fullMonthRows.map((r) =>
        colHeaders.map((h) => {
          if (h === 'SL') return r.SL;
          if (h === 'EMP ID') return r.EMP_ID;
          if (h === 'NAME') return r.NAME;
          if (h === 'FATHER NAME') return r.FATHER_NAME;
          if (h === 'REFFERENCE') return r.REFFERENCE;
          if (h === 'JOIN DATE') return r.JOIN_DATE;
          if (h === 'CLOSING DATE') return r.CLOSING_DATE;
          if (h === 'TOTAL') return r.TOTAL;
          return r[h] || '';
        })
      );

      const headerRow1 = new Array(colHeaders.length).fill('');
      headerRow1[0] = `Project: ${projectName}`;

      const headerRow2 = new Array(colHeaders.length).fill('');
      headerRow2[0] = `Month: ${monthName} ${year}`;

      const allRows = [headerRow1, headerRow2, colHeaders, ...dataRows];

      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: colHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: colHeaders.length - 1 } },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `${filename}_full_month.xlsx`);
    } else {
      exportToExcel(rows, cols, filename);
    }
  };

  const handlePdf = () => {
    setOpen(false);
    if (fullMonthRows?.length && month && year && projectName) {
      const firstRow = fullMonthRows[0];
      const dayKeys = Object.keys(firstRow).filter((k) => /^\d+$/.test(k));

      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(12);
      doc.text(`Project: ${projectName}`, 14, 12);
      doc.setFontSize(11);
      doc.text(`Month: ${monthName} ${year}`, 14, 20);

      const colHeaders = [
        'SL', 'EMP ID', 'NAME', 'FATHER NAME', 'REFFERENCE',
        'JOIN DATE', 'CLOSING DATE',
        ...dayKeys,
        'TOTAL'
      ];

      const body = fullMonthRows.map((r) =>
        colHeaders.map((h) => {
          if (h === 'SL') return r.SL;
          if (h === 'EMP ID') return r.EMP_ID;
          if (h === 'NAME') return r.NAME;
          if (h === 'FATHER NAME') return r.FATHER_NAME;
          if (h === 'REFFERENCE') return r.REFFERENCE;
          if (h === 'JOIN DATE') return r.JOIN_DATE;
          if (h === 'CLOSING DATE') return r.CLOSING_DATE;
          if (h === 'TOTAL') return r.TOTAL;
          return r[h] || '';
        })
      );

      autoTable(doc, {
        head: [colHeaders],
        body,
        startY: 26,
        styles: { fontSize: 6, cellPadding: 1.5 },
        headStyles: { fillColor: [0, 85, 255], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 18 },
          2: { cellWidth: 30 },
          3: { cellWidth: 22 },
          4: { cellWidth: 18 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
        },
      });

      doc.save(`${filename}_full_month.pdf`);
    } else {
      exportToPdf(rows, cols, title, filename);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" style={s.secondaryBtn} onClick={() => setOpen((p) => !p)}>
        <Download size={14} /> Download
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 0',
            zIndex: 200,
            minWidth: 140,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <button
            type="button"
            onClick={handleExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            type="button"
            onClick={handlePdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportToolbar;