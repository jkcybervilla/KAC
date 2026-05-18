import { useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'kac_column_visibility';

const DEFAULT_VISIBILITY = {
  sl: true,
  projectName: true,
  type: true,
  coordinator: true,
  accountant: true,
  currentManpower: true,
  activeStatus: true,
  manpower: true,
  lineName: true,
  district: true,
  client: true,
  vendors: true,
  poNumber: true,
  gemId: true,
  region: true,
  reqManpower: true,
};

export const loadSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_VISIBILITY, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_VISIBILITY };
};

const saveSettings = (visibility) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};

const COLUMNS = [
  { key: 'sl', label: 'SL NO' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'type', label: 'Type' },
  { key: 'coordinator', label: 'Co-ordinator' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'currentManpower', label: 'Current Manpower' },
  { key: 'activeStatus', label: 'Active Status' },
  { key: 'manpower', label: 'Manpower' },
  { key: 'lineName', label: 'Line Name' },
  { key: 'district', label: 'District' },
  { key: 'client', label: 'Client' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'poNumber', label: 'PO Number' },
  { key: 'gemId', label: 'GEM ID' },
  { key: 'region', label: 'Region' },
  { key: 'reqManpower', label: 'Required Manpower' },
];

const ColumnSettings = ({ isOpen, onClose, visibility, onVisibilityChange }) => {
  useEffect(() => {
    if (visibility) {
      saveSettings(visibility);
    }
  }, [visibility]);

  if (!isOpen) return null;

  const allVisible = COLUMNS.every((col) => visibility[col.key]);

  const toggleAll = () => {
    const newVal = !allVisible;
    const updated = {};
    COLUMNS.forEach((col) => {
      updated[col.key] = newVal;
    });
    onVisibilityChange(updated);
  };

  const toggleColumn = (key) => {
    onVisibilityChange({ ...visibility, [key]: !visibility[key] });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>COLUMN VISIBILITY</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>
        <p style={styles.subtitle}>Show / hide columns in the project grid.</p>

        <button type="button" onClick={toggleAll} style={styles.toggleAllBtn}>
          {allVisible ? 'HIDE ALL' : 'SHOW ALL'}
        </button>

        <div style={styles.grid}>
          {COLUMNS.map((col) => (
            <label key={col.key} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={!!visibility[col.key]}
                onChange={() => toggleColumn(col.key)}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>{col.label}</span>
            </label>
          ))}
        </div>

        <button type="button" onClick={onClose} style={styles.doneBtn}>
          DONE
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0a0a0a',
    padding: '28px',
    borderRadius: '15px',
    width: '100%',
    maxWidth: '480px',
    border: '1px solid #1a1a1a',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    borderBottom: '1px solid #111',
    paddingBottom: '15px',
  },
  title: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' },
  subtitle: { margin: '0 0 16px 0', color: '#9ca3af', fontSize: '13px' },
  toggleAllBtn: {
    backgroundColor: '#111',
    border: '1px solid #222',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'inline-block',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#000',
    border: '1px solid #1a1a1a',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#0055ff',
    cursor: 'pointer',
  },
  checkboxText: {
    color: '#ccc',
    fontSize: '12px',
    fontWeight: '500',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#0055ff',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
    fontSize: '13px',
  },
};

export default ColumnSettings;