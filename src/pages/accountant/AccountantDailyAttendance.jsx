import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Search, Save, Eye, EyeOff } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { getBatchId, countPresent } from '../../utils/attendance';
import Select from 'react-select';

ModuleRegistry.registerModules([AllCommunityModule]);

const darkQuartzTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--text-soft)',
  headerBackgroundColor: 'var(--surface-2)',
  headerTextColor: 'var(--text)',
  borderColor: 'var(--border-strong)',
  rowHoverColor: 'var(--surface-2)',
  oddRowBackgroundColor: 'var(--surface)',
  fontFamily: 'Inter, sans-serif',
  rowHeight: 36,
  headerHeight: 40,
  wrapperBorderRadius: '12px',
  borderRadius: 0,
});

const customSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    minWidth: 140,
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--surface)',
    cursor: 'pointer',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--accent)' },
  }),
  menu: (base) => ({
    ...base,
    fontSize: 12,
    zIndex: 200,
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    background: isSelected ? '#0055ff' : isFocused ? 'var(--accent-soft)' : 'transparent',
    color: isSelected ? '#fff' : 'var(--text)',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--text)' }),
  dropdownIndicator: (base) => ({ ...base, padding: '0 4px' }),
};

const attendanceOptions = [
  { value: 'P', label: 'All Present' },
  { value: 'A', label: 'All Absent' },
  { value: 'C', label: 'All Close' },
];

/** Helper to convert Date to YYYY-MM-DD */
const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/** Get the next sequential date to save (first unsaved date from 1st of month onwards) */
const getNextUnsavedDate = (savedDatesSet, year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!savedDatesSet.has(str)) {
      return str;
    }
  }
  return null; // all dates saved
};

const DateHeaderComponent = ({ setDate, selectedDate, minDate, maxDate }) => {
  const headerRef = useRef(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', height: '100%' }}>
      <input
        ref={headerRef}
        type="date"
        value={selectedDate}
        min={minDate}
        max={maxDate}
        onChange={(e) => setDate(e.target.value)}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          padding: '2px 0',
          fontFamily: 'Inter, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const AccountantDailyAttendance = ({ type, projectName }) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const todayStr = toDateStr(now);
  const firstDayStr = toDateStr(firstDayOfMonth);
  const lastDayStr = todayStr; // max = today, no future dates
  const [selectedDate, setSelectedDate] = useState(() => todayStr);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({
    EMP_ID: true,
    FATHER_NAME: false,
    REFFERENCE: false,
    DESIGNATION: false,
    CLOSE_DATE: false,
  });
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const [savedDates, setSavedDates] = useState(new Set());
  const [fullMonthData, setFullMonthData] = useState([]);
  const gridRef = useRef(null);
  const columnApiRef = useRef(null);
  const workersRef = useRef([]);
  const attMapRef = useRef({});

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const day = dateObj.getDate();
  const batchId = getBatchId(month, year);
  const coll = type === 'office' ? 'attendance_office' : 'attendance_client';

  const isDateSaved = savedDates.has(selectedDate);

  // Find which is the next unsaved date (sequential order)
  const nextUnsavedDate = getNextUnsavedDate(savedDates, currentYear, currentMonth);
  const canEditThisDate = selectedDate === nextUnsavedDate || nextUnsavedDate === null;

  useEffect(() => {
    if (!projectName) return;
    (async () => {
      setLoading(true);
      try {
        const [wSnap, aSnap] = await Promise.all([
          getDocs(collection(db, 'workers')),
          getDocs(collection(db, coll)),
        ]);
        const workers = wSnap.docs
          .map((d) => d.data())
          .filter((w) => (w.PROJECT || '') === projectName && (w.STATUS || 'ACTIVE') === 'ACTIVE');
        const attMap = {};
        const foundDates = new Set();
        aSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.batchId === batchId) {
            attMap[data.EMPID] = data;
            if (data.days) {
              Object.keys(data.days).forEach((dStr) => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dStr).padStart(2, '0')}`;
                foundDates.add(dateStr);
              });
            }
          }
        });
        setSavedDates(foundDates);

        // Auto-select the next unsaved date
        const next = getNextUnsavedDate(foundDates, currentYear, currentMonth);
        if (next) {
          setSelectedDate(next);
        }

        // Check if selected date is in the future
        const selectedDateObj = new Date(selectedDate + 'T00:00:00');
        const todayObj = new Date(todayStr + 'T00:00:00');
        const isFutureDate = selectedDateObj > todayObj;

        const built = workers.map((w, i) => {
          const days = attMap[w.EMPID]?.days || {};
          // Check if worker's joining date is after the selected date
          const joiningDate = w.JOINING_DATE_OFFICE || w.CLOSE_DATE || '';
          let isBeforeJoining = false;
          if (joiningDate) {
            const joinDateObj = new Date(joiningDate);
            if (!isNaN(joinDateObj.getTime()) && selectedDateObj < joinDateObj) {
              isBeforeJoining = true;
            }
          }
          const dayVal = (isBeforeJoining || isFutureDate) ? '' : (days[String(day)] || 'P');
          const total = countPresent(days, day);
          return {
            id: w.EMPID || `emp_${i}`,
            SLNO: i + 1,
            EMP_ID: w.EMPID || '',
            WORKER_NAME: w.WORKER_NAME,
            FATHER_NAME: w.FATHER_NAME || '',
            REFFERENCE: w.REFFERENCE || '—',
            DESIGNATION: w.DESIGNATION || '—',
            CLOSE_DATE: w.CLOSE_DATE || w.JOINING_DATE_OFFICE || '—',
            ATTENDANCE: dayVal,
            TOTAL_DAY: total,
            _isSaved: foundDates.has(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
            _isClosed: dayVal === 'C',
            _isBeforeJoining: isBeforeJoining,
            _isFutureDate: isFutureDate,
          };
        });
        setRows(built);

        // Store full month data for export
        workersRef.current = workers;
        attMapRef.current = attMap;
        const monthDays = new Date(year, month, 0).getDate();
        const lastExportDay = Math.min(monthDays, now.getDate());
        const exportRows = workers.map((w, i) => {
          const days = attMap[w.EMPID]?.days || {};
          const row = {
            SL: i + 1,
            EMP_ID: w.EMPID || '',
            NAME: w.WORKER_NAME,
            FATHER_NAME: w.FATHER_NAME || '',
            REFFERENCE: w.REFFERENCE || '—',
            JOIN_DATE: w.JOINING_DATE_OFFICE || '—',
            CLOSING_DATE: w.CLOSE_DATE || '—',
          };
          let rowTotal = 0;
          for (let d = 1; d <= lastExportDay; d++) {
            const val = days[String(d)] || '';
            row[String(d)] = val;
            if (val === 'P') rowTotal++;
          }
          row.TOTAL = rowTotal;
          return row;
        });
        setFullMonthData(exportRows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate, projectName, coll, batchId, day, year, month, currentYear, currentMonth]);

  const isEditable = useCallback(
    (params) => {
      if (params.colDef.field !== 'ATTENDANCE') return false;
      if (isDateSaved) return false;
      if (!canEditThisDate) return false;
      // If this specific worker is closed, lock their cell
      if (params.data?._isClosed) return false;
      // If date is before joining date, not editable
      if (params.data?._isBeforeJoining) return false;
      // Future dates not editable
      if (params.data?._isFutureDate) return false;
      return true;
    },
    [isDateSaved, canEditThisDate]
  );

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL NO', width: 80, editable: false, suppressAutoSize: false },
      { 
        field: 'EMP_ID', headerName: 'EMP ID', flex: 1, editable: false,
        hide: !columnVisibility.EMP_ID,
      },
      { field: 'WORKER_NAME', headerName: 'NAME', flex: 2, editable: false },
      { 
        field: 'FATHER_NAME', headerName: 'FATHER NAME', flex: 1, editable: false,
        hide: !columnVisibility.FATHER_NAME,
      },
      { 
        field: 'REFFERENCE', headerName: 'REFFERENCE', flex: 1, editable: false,
        hide: !columnVisibility.REFFERENCE,
      },
      { 
        field: 'DESIGNATION', headerName: 'DESIGNATION', flex: 1, editable: false,
        hide: !columnVisibility.DESIGNATION,
      },
      { 
        field: 'CLOSE_DATE', headerName: 'CLOSE DATE', flex: 1, editable: false,
        hide: !columnVisibility.CLOSE_DATE,
      },
      { 
        field: 'ATTENDANCE', headerName: '', flex: 1,
        editable: isEditable,
        singleClickEdit: true,
        headerComponent: DateHeaderComponent,
        headerComponentParams: { 
          setDate: (val) => {
            setSelectedDate(val);
          },
          selectedDate: selectedDate,
          minDate: firstDayStr,
          maxDate: lastDayStr,
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['P', 'A', 'C'] },
        cellStyle: (params) => {
          const base = { display: 'flex', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', borderRadius: 4 };
          if (params.data?._isFutureDate) {
            return { ...base, color: 'transparent', background: 'rgba(255,255,255,0.02)', cursor: 'default' };
          }
          if (params.data?._isBeforeJoining) {
            return { ...base, color: 'transparent', background: 'rgba(255,255,255,0.02)', cursor: 'default' };
          }
          if (params.data?._isSaved) {
            return { ...base, color: '#888', background: 'rgba(255,255,255,0.02)' };
          }
          if (!canEditThisDate) {
            return { ...base, color: '#666', background: 'rgba(255,255,255,0.02)' };
          }
          if (params.data?._isClosed) {
            return { ...base, color: '#cc8800', background: 'rgba(255,170,0,0.1)', cursor: 'not-allowed' };
          }
          if (params.value === 'A') return { ...base, color: '#ff4444', background: 'rgba(255,255,255,0.05)' };
          if (params.value === 'C') return { ...base, color: '#ffaa00', background: 'rgba(255,255,255,0.05)' };
          return { ...base, color: '#22c55e', background: 'rgba(255,255,255,0.05)' };
        }
      },
      { field: 'TOTAL_DAY', headerName: 'TOTAL', flex: 1, editable: false },
    ],
    [isEditable, selectedDate, firstDayStr, lastDayStr, canEditThisDate, columnVisibility]
  );

  const subtotal = rows.reduce((s, r) => s + (Number(r.TOTAL_DAY) || 0), 0);
  const footerRowData = useMemo(() => [{
    SLNO: '',
    EMP_ID: '',
    WORKER_NAME: 'TOTAL',
    FATHER_NAME: '',
    REFFERENCE: '',
    DESIGNATION: '',
    CLOSE_DATE: '',
    ATTENDANCE: '',
    TOTAL_DAY: subtotal,
  }], [subtotal]);

  const toggleColumn = useCallback((field) => {
    setColumnVisibility((prev) => {
      const nextVisible = !prev[field];
      // Also update AG Grid column API if available
      if (columnApiRef.current) {
        columnApiRef.current.setColumnVisible(field, nextVisible);
      }
      return { ...prev, [field]: nextVisible };
    });
  }, []);

  const setAllAttendance = (value) => {
    if (!canEditThisDate) {
      alert('Please save the current date first before editing another date.');
      return;
    }
    setRows((prev) => {
      const updated = prev.map((r) => ({ ...r, ATTENDANCE: value }));
      return updated;
    });
  };

  const onCellValueChanged = useCallback((params) => {
    const field = params.colDef.field;
    if (field === 'ATTENDANCE') {
      setRows((prev) => {
        const updated = prev.map((r) => {
          if (r.id === params.data.id) {
            // If setting to 'C', mark as closed (locked) forever
            const newVal = params.newValue;
            return { ...r, ATTENDANCE: newVal, _isClosed: newVal === 'C' };
          }
          return r;
        });
        return updated;
      });
    }
  }, []);

  const saveAttendance = async () => {
    if (!projectName) return;
    if (isDateSaved) {
      alert('This date has already been saved. Editing is not allowed.');
      return;
    }
    if (!canEditThisDate) {
      alert('Please save dates in sequential order. Save the current date first, then proceed to the next.');
      return;
    }
    setSaving(true);
    try {
      // Fetch existing docs for this batch
      const aSnap = await getDocs(collection(db, coll));
      let existingIds = {};
      aSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId) {
          existingIds[data.EMPID] = d.id;
        }
      });

      for (const r of rows) {
        const empId = r.id;
        const payload = {
          batchId,
          EMPID: empId,
          days: { [String(day)]: r.ATTENDANCE || 'P' },
          PROJECT: projectName,
          updatedAt: new Date().toISOString(),
        };

        if (existingIds[empId]) {
          // Update only the day field in existing doc
          const existingDoc = await getDoc(doc(db, coll, existingIds[empId]));
          const existingData = existingDoc.data() || {};
          const existingDays = existingData.days || {};
          existingDays[String(day)] = r.ATTENDANCE || 'P';
          await updateDoc(doc(db, coll, existingIds[empId]), { days: existingDays, updatedAt: payload.updatedAt });
        } else {
          await addDoc(collection(db, coll), payload);
        }
      }
      // Mark this date as saved
      setSavedDates((prev) => {
        const next = new Set(prev);
        next.add(selectedDate);
        return next;
      });
      alert('Attendance saved successfully!');
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!projectName) return <p style={{ color: '#666' }}>Select a project from the header.</p>;
  if (loading) return <p style={{ color: '#666' }}>Loading...</p>;

  return (
    <>
      <div style={{ ...s.filterRow, marginBottom: 8 }}>
        <div style={{ ...s.searchBox, padding: '2px 6px', gap: '4px' }}>
          <Search size={10} color="#444" />
          <input type="text" placeholder="Filter..." style={{ ...s.searchInput, fontSize: '10px', width: '70px' }} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setColumnDropdownOpen((prev) => !prev)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-soft)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Eye size={14} /> Columns
          </button>
          {columnDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 0',
                zIndex: 100,
                minWidth: 180,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              {[
                { field: 'EMP_ID', label: 'EMP ID' },
                { field: 'FATHER_NAME', label: 'FATHER NAME' },
                { field: 'REFFERENCE', label: 'REFFERENCE' },
                { field: 'DESIGNATION', label: 'DESIGNATION' },
                { field: 'CLOSE_DATE', label: 'CLOSE DATE' },
              ].map((c) => (
                <label
                  key={c.field}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    fontSize: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={!!columnVisibility[c.field]}
                    onChange={() => toggleColumn(c.field)}
                    style={{ accentColor: '#0055ff' }}
                  />
                  <span style={{ fontWeight: columnVisibility[c.field] ? 600 : 400 }}>
                    {c.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#888' }}>
                    {columnVisibility[c.field] ? <Eye size={12} /> : <EyeOff size={12} />}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <ExportToolbar rows={rows} columnDefs={columnDefs} title={`${type} ${selectedDate}`} filename={`${type}-${selectedDate}`} fullMonthRows={fullMonthData} month={month} year={year} projectName={projectName} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Quick Actions:</span>
        <Select
          options={attendanceOptions}
          placeholder="Set all to..."
          isClearable
          onChange={(option) => {
            if (option) setAllAttendance(option.value);
          }}
          styles={customSelectStyles}
        />
        <div style={{ flex: 1 }} />
        {isDateSaved && (
          <span style={{ fontSize: 11, color: '#ffaa00', fontWeight: 600, marginRight: 8 }}>
            ⚠ Already saved — editing locked
          </span>
        )}
        {!isDateSaved && !canEditThisDate && (
          <span style={{ fontSize: 11, color: '#ff6b6b', fontWeight: 600, marginRight: 8 }}>
            ⏳ Save earlier dates first
          </span>
        )}
        <button
          type="button"
          onClick={saveAttendance}
          disabled={saving || isDateSaved || !canEditThisDate}
          style={{
            padding: '6px 16px', borderRadius: 6, border: 'none',
            background: saving || isDateSaved || !canEditThisDate ? '#888' : '#0055ff',
            color: '#fff',
            cursor: saving || isDateSaved || !canEditThisDate ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Save size={14} /> {saving ? 'SAVING...' : isDateSaved ? 'ALREADY SAVED' : 'SAVE'}
        </button>
      </div>
      <div style={s.gridSection}>
        <div style={{ height: '60vh', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ filter: true, sortable: true, editable: false, flex: 1, minWidth: 80, resizable: true }}
            quickFilterText={searchText}
            theme={darkQuartzTheme}
            pinnedBottomRowData={footerRowData}
            rowHeight={34}
            headerHeight={38}
            onGridReady={(params) => {
              columnApiRef.current = params.columnApi;
              Object.entries(columnVisibility).forEach(([field, visible]) => {
                params.columnApi.setColumnVisible(field, visible);
              });
              setTimeout(() => {
                params.api.sizeColumnsToFit();
              }, 200);
            }}
            onGridSizeChanged={(params) => {
              params.api.sizeColumnsToFit();
            }}
            onCellValueChanged={onCellValueChanged}
          />
        </div>
      </div>
    </>
  );
};

export default AccountantDailyAttendance;