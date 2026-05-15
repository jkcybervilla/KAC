import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { pageStyles as s } from '../styles/pageStyles';
import { exportToExcel, exportToPdf, getExportColumns } from '../utils/export';

const ExportToolbar = ({ rows, columnDefs, title, filename }) => {
  const cols = getExportColumns(columnDefs);

  return (
    <>
      <button type="button" style={s.secondaryBtn} onClick={() => exportToExcel(rows, cols, filename)}>
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button type="button" style={s.secondaryBtn} onClick={() => exportToPdf(rows, cols, title, filename)}>
        <FileText size={14} /> PDF
      </button>
    </>
  );
};

export default ExportToolbar;
