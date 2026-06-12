import React, { useEffect, useState, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Search, Save, ChevronDown, Zap, Settings } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { getBatchId, countPresent } from '../../utils/attendance';

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

const STATUS_OPTIONS = [
  { value: 'P', label: 'P', color: '#22c55e', tooltip: 'Present' },
  { value: 'A', label: 'A', color: '#ef4444', tooltip: 'Absent' },
  { value: 'H', label: 'H', color: '#f59e0b', tooltip: 'Holiday (Paid)' },
  { value: 'C', label: 'C', color: '#6b7280', tooltip: 'Closed' },
];

const STATUS_COLORS = {
  P: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  A: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  H: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  C: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af' },
};

const AccountantDailyAttendance = forwardRef(({ type, projectName }, ref) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayStr = toDateStr(now);
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
  const [savedDates, setSavedDates] = useState(new Set());
  const [fullMonthData, setFullMonthData] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [showStatusFilterPanel, setShowStatusFilterPanel] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null); // worker id
  const hasAutoSelectedRef = useRef(false);
  const searchPanelRef = useRef(null);
  const referencePanelRef = useRef(null);
  const statusFilterPanelRef = useRef(null);
  const settingsRef = useRef(null);
  const quickActionRef = useRef(null);
  const dateStripRef = useRef(null);
  const workersRef = useRef([]);
  const attMapRef = useRef({});
  // Use a Set ref to track all status dropdown button elements for outside-click detection
  const statusDropdownBtnRefs = useRef({});
  const statusDropdownPanelRefs = useRef({});

  // Expose methods and data to parent dashboard (AccountantDashboard)
  useImperativeHandle(ref, () => ({
    openExport: () => {
      // Now handled directly via getExportData in the dashboard
    },
    openSettings: () => {
      setShowSettings((prev) => !prev);
    },
    openSearchPanel: () => {
      setShowSearchPanel((prev) => !prev);
      setShowReferencePanel(false);
      setShowStatusFilterPanel(false);
    },
    openReferencePanel: () => {
      setShowReferencePanel((prev) => !prev);
      setShowSearchPanel(false);
      setShowStatusFilterPanel(false);
    },
    openStatusPanel: () => {
      setShowStatusFilterPanel((prev) => !prev);
      setShowSearchPanel(false);
      setShowReferencePanel(false);
    },
    getExportData: () => ({
      rows,
      columnDefs: exportColumnDefs,
      title: `${type} ${selectedDate}`,
      filename: `${type}-${selectedDate}`,
      fullMonthRows: fullMonthData,
      month,
      year,
      projectName,
    }),
  }));

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const day = dateObj.getDate();
  const batchId = getBatchId(month, year);
  const coll = type === 'office' ? 'attendance_office' : 'attendance_client';
  const subtitleLabel = type === 'office' ? 'Office MP' : 'Client MP';

  const isDateSaved = savedDates.has(selectedDate);

  // Find which is the next unsaved date (sequential order)
  const nextUnsavedDate = getNextUnsavedDate(savedDates, currentYear, currentMonth);
  const canEditThisDate = selectedDate === nextUnsavedDate || nextUnsavedDate === null;

  // Generate month days for date strip
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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

        // Auto-select the next unsaved date only on initial mount
        const next = getNextUnsavedDate(foundDates, currentYear, currentMonth);
        if (!hasAutoSelectedRef.current && next) {
          setSelectedDate(next);
          hasAutoSelectedRef.current = true;
        }

        // Check if selected date is in the future
        const selectedDateObj = new Date(selectedDate + 'T00:00:00');
        const todayObj = new Date(todayStr + 'T00:00:00');
        const isFutureDate = selectedDateObj > todayObj;

        const built = workers.map((w, i) => {
          const days = attMap[w.EMPID]?.days || {};
          // Check if worker's joining date is after the selected date
          const joiningDate = type === 'office' ? (w.JOINING_DATE_OFFICE || '') : (w.JOINING_DATE_CLIENT || '');
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
        const monthDaysCount = new Date(year, month, 0).getDate();
        const lastExportDay = Math.min(monthDaysCount, now.getDate());
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

  const setAllAttendance = (value) => {
    if (!canEditThisDate) {
      alert('Please save the current date first before editing another date.');
      return;
    }
    setRows((prev) => {
      const updated = prev.map((r) => ({ ...r, ATTENDANCE: value }));
      return updated;
    });
    setShowQuickAction(false);
  };

  const updateWorkerAttendance = (workerId, newValue) => {
    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.id === workerId) {
          return { ...r, ATTENDANCE: newValue, _isClosed: newValue === 'C' };
        }
        return r;
      });
      return updated;
    });
    setOpenStatusDropdown(null);
  };

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

  // Close dropdowns when clicking outside — fixed to handle multiple status dropdowns
  useEffect(() => {
    const handleClick = (e) => {
      // Settings dropdown
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
      // Quick action dropdown
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) {
        setShowQuickAction(false);
      }
      // Search panel
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target)) {
        setShowSearchPanel(false);
      }
      // Reference panel
      if (referencePanelRef.current && !referencePanelRef.current.contains(e.target)) {
        setShowReferencePanel(false);
      }
      // Status filter panel
      if (statusFilterPanelRef.current && !statusFilterPanelRef.current.contains(e.target)) {
        setShowStatusFilterPanel(false);
      }
      // Status dropdowns — check if click is outside ALL status dropdown buttons and panels
      if (openStatusDropdown !== null) {
        const btnRef = statusDropdownBtnRefs.current[openStatusDropdown];
        const panelRef = statusDropdownPanelRefs.current[openStatusDropdown];
        const clickedBtn = btnRef && btnRef.contains(e.target);
        const clickedPanel = panelRef && panelRef.contains(e.target);
        if (!clickedBtn && !clickedPanel) {
          setOpenStatusDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openStatusDropdown]);

  const toggleColumn = useCallback((field) => {
    setColumnVisibility((prev) => {
      const nextVisible = !prev[field];
      return { ...prev, [field]: nextVisible };
    });
  }, []);

  // Unique reference values from current rows
  const referenceOptions = useMemo(() => {
    const refs = new Set();
    rows.forEach((r) => {
      const ref = (r.REFFERENCE || '').trim();
      if (ref && ref !== '—') {
        refs.add(ref);
      }
    });
    return Array.from(refs).sort();
  }, [rows]);

  // Filtered + searched + reference-filtered rows
  const filteredRows = useMemo(() => {
    let result = rows;
    // Apply reference filter
    if (selectedReferences.length > 0) {
      result = result.filter((r) => selectedReferences.includes(r.REFFERENCE));
    }
    // Apply status filter
    if (selectedStatuses.length > 0) {
      result = result.filter((r) => selectedStatuses.includes(r.ATTENDANCE));
    }
    // Apply search text filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((r) => {
        const name = (r.WORKER_NAME || '').toLowerCase();
        const empId = (r.EMP_ID || '').toLowerCase();
        const desig = (r.DESIGNATION || '').toLowerCase();
        const father = (r.FATHER_NAME || '').toLowerCase();
        return name.includes(q) || empId.includes(q) || desig.includes(q) || father.includes(q);
      });
    }
    return result;
  }, [rows, searchText, selectedReferences, selectedStatuses]);

  const presentCount = filteredRows.filter((r) => r.ATTENDANCE === 'P' && !r._isBeforeJoining && !r._isFutureDate).length;
  const absentCount = filteredRows.filter((r) => r.ATTENDANCE === 'A' && !r._isBeforeJoining && !r._isFutureDate).length;
  const totalWorkers = filteredRows.filter((r) => !r._isBeforeJoining && !r._isFutureDate).length;
  const totalDaysSum = filteredRows
    .filter((r) => !r._isBeforeJoining && !r._isFutureDate)
    .reduce((sum, r) => sum + (r.TOTAL_DAY || 0), 0);

  // Build column defs for export toolbar (keeps export working)
  const exportColumnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL NO' },
      { field: 'EMP_ID', headerName: 'EMP ID' },
      { field: 'WORKER_NAME', headerName: 'NAME' },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME' },
      { field: 'REFFERENCE', headerName: 'REFFERENCE' },
      { field: 'DESIGNATION', headerName: 'DESIGNATION' },
      { field: 'CLOSE_DATE', headerName: 'CLOSE DATE' },
      { field: 'ATTENDANCE', headerName: 'ATTENDANCE' },
      { field: 'TOTAL_DAY', headerName: 'TOTAL' },
    ],
    []
  );

  const isRowInteractive = !isDateSaved && canEditThisDate;

  // Build subtitle string for a worker row based on column visibility
  const buildSubtitle = (row) => {
    const parts = [];
    if (columnVisibility.EMP_ID !== false && row.EMP_ID) {
      parts.push(row.EMP_ID);
    }
    if (columnVisibility.DESIGNATION !== false && row.DESIGNATION !== '—') {
      parts.push(row.DESIGNATION);
    }
    if (columnVisibility.FATHER_NAME !== false && row.FATHER_NAME) {
      parts.push(row.FATHER_NAME);
    }
    if (columnVisibility.REFFERENCE !== false && row.REFFERENCE !== '—') {
      parts.push(row.REFFERENCE);
    }
    if (columnVisibility.CLOSE_DATE !== false && row.CLOSE_DATE !== '—') {
      parts.push(`Close: ${row.CLOSE_DATE}`);
    }
    return parts.length > 0 ? parts.join(' · ') : '—';
  };

  if (!projectName) return <p style={{ color: 'var(--muted)', padding: 24 }}>Select a project from the header.</p>;
  if (loading) return <p style={{ color: 'var(--muted)', padding: 24 }}>Loading...</p>;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* ============= DATE STRIP ============= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px 4px 12px',
      }}>
        <div ref={dateStripRef} style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
        }}>
          <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
            {monthDays.map((d) => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isActive = dateStr === selectedDate;
              const isSaved = savedDates.has(dateStr);
              const isToday = dateStr === todayStr;
              const isFutureDate = dateStr > todayStr;

              return (
                <button
                  key={d}
                  onClick={() => !isFutureDate && setSelectedDate(dateStr)}
                  disabled={isFutureDate}
                  style={{
                    minWidth: 34,
                    height: 42,
                    borderRadius: 8,
                    border: isActive
                      ? '2px solid #0055ff'
                      : isSaved
                        ? '2px solid rgba(34,197,94,0.5)'
                        : '2px solid transparent',
                    background: isActive
                      ? '#0055ff'
                      : 'var(--surface-2)',
                    color: isActive
                      ? '#ffffff'
                      : isSaved
                        ? '#22c55e'
                        : isFutureDate
                          ? 'var(--muted-2)'
                          : 'var(--text-soft)',
                    cursor: isFutureDate ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: isActive ? 800 : 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    opacity: isFutureDate ? 0.4 : 1,
                    padding: '2px 4px',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    lineHeight: 1.1,
                    fontSize: isActive ? 12 : 11,
                  }}>{d}</span>
                  {isSaved && (
                    <span style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: isActive ? '#ffffff' : '#22c55e',
                      display: 'block',
                      marginTop: 1,
                    }} />
                  )}
                  {isToday && !isActive && (
                    <span style={{
                      position: 'absolute',
                      top: 1,
                      right: 3,
                      fontSize: 7,
                      color: '#0055ff',
                      fontWeight: 800,
                    }}>•</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============= STATS ROW: Present + Absent + Quick Action ============= */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', alignItems: 'stretch' }}>
        <div style={{
          flex: 1,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 10,
          padding: '8px 10px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e', lineHeight: 1.2 }}>
            {presentCount}
          </div>
          <div style={{
            fontSize: 9,
            color: '#22c55e',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>
            Present
          </div>
        </div>
        <div style={{
          flex: 1,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          padding: '8px 10px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444', lineHeight: 1.2 }}>
            {absentCount}
          </div>
          <div style={{
            fontSize: 9,
            color: '#ef4444',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>
            Absent
          </div>
        </div>
        {/* Quick Action */}
        <div ref={quickActionRef} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setShowQuickAction(!showQuickAction)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: showQuickAction ? 'rgba(0,85,255,0.1)' : 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: showQuickAction ? '#0055ff' : 'var(--text-soft)',
              fontSize: 12,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              height: '100%',
            }}
            title="Quick action"
          >
            <Zap size={14} />
            <ChevronDown size={12} />
          </button>
          {showQuickAction && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              zIndex: 1000,
              minWidth: 140,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}>
              {[
                { label: 'All Present', value: 'P' },
                { label: 'All Absent', value: 'A' },
                { label: 'All Close', value: 'C' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAllAttendance(opt.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panels triggered via refs from header 3-dot menu */}
      <div style={{ position: 'relative', height: 0, overflow: 'visible', zIndex: 9999 }}>
        {/* Settings panel (hidden button, functional via ref) */}
        <div ref={settingsRef} style={{ position: 'absolute', top: 0, right: 12, display: showSettings ? 'block' : 'none' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--text-soft)',
              fontSize: 12,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            title="Settings"
          >
            <Settings size={14} />
          </button>
          {showSettings && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              zIndex: 1000,
              minWidth: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text)',
                borderBottom: '1px solid var(--border)',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>Filter bar</span>
                <input
                  type="checkbox"
                  checked={showFilterBar}
                  onChange={() => setShowFilterBar(!showFilterBar)}
                  style={{ accentColor: '#0055ff', cursor: 'pointer' }}
                />
              </label>
              {[
                { field: 'FATHER_NAME', label: 'Father name' },
                { field: 'REFFERENCE', label: 'Reference' },
                { field: 'DESIGNATION', label: 'Designation' },
                { field: 'CLOSE_DATE', label: 'Close date' },
              ].map((c) => (
                <label
                  key={c.field}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: columnVisibility[c.field] !== false ? 'var(--text)' : 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{c.label}</span>
                  <input
                    type="checkbox"
                    checked={columnVisibility[c.field] !== false}
                    onChange={() => toggleColumn(c.field)}
                    style={{ accentColor: '#0055ff', cursor: 'pointer' }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Search panel */}
        <div ref={searchPanelRef} style={{ position: 'absolute', top: 0, right: 12 }}>
          {showSearchPanel && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              zIndex: 1000,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
              }}>
                <Search size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search workers..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    minWidth: 0,
                  }}
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reference panel */}
        <div ref={referencePanelRef} style={{ position: 'absolute', top: 0, right: 12 }}>
          {showReferencePanel && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              zIndex: 1000,
              minWidth: 200,
              maxHeight: 320,
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {selectedReferences.length > 0 && (
                <button
                  onClick={() => setSelectedReferences([])}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✕ Clear filter
                </button>
              )}
              {referenceOptions.length === 0 ? (
                <div style={{ padding: '14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                  No references found
                </div>
              ) : (
                referenceOptions.map((ref) => (
                  <label
                    key={ref}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedReferences.includes(ref)}
                      onChange={() => {
                        setSelectedReferences((prev) =>
                          prev.includes(ref)
                            ? prev.filter((r) => r !== ref)
                            : [...prev, ref]
                        );
                      }}
                      style={{ accentColor: '#0055ff', cursor: 'pointer' }}
                    />
                    <span>{ref}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Status filter panel */}
        <div ref={statusFilterPanelRef} style={{ position: 'absolute', top: 0, right: 12 }}>
          {showStatusFilterPanel && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              zIndex: 1000,
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {selectedStatuses.length > 0 && (
                <button
                  onClick={() => setSelectedStatuses([])}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✕ Clear filter
                </button>
              )}
              {[
                { value: 'P', label: 'Present (P)' },
                { value: 'A', label: 'Absent (A)' },
                { value: 'H', label: 'Holiday (H)' },
                { value: 'C', label: 'Closed (C)' },
              ].map((opt) => {
                const count = rows.filter((r) => r.ATTENDANCE === opt.value && !r._isBeforeJoining && !r._isFutureDate).length;
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(opt.value)}
                      onChange={() => {
                        setSelectedStatuses((prev) =>
                          prev.includes(opt.value)
                            ? prev.filter((s) => s !== opt.value)
                            : [...prev, opt.value]
                        );
                      }}
                      style={{ accentColor: '#0055ff', cursor: 'pointer' }}
                    />
                    <span>{opt.label} — {count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ============= FILTER BAR (optional) ============= */}
      {showFilterBar && (
        <div style={{ padding: '0 12px 8px 12px' }}>
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 10px',
          }}>
            <Search size={14} color="var(--muted)" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}

      {/* ============= TABLE HEADER ROW ============= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ width: 32, textAlign: 'center' }}>SL</div>
        <div style={{ flex: 1, paddingLeft: 6 }}>
          Name
        </div>
        <div style={{ width: 54, textAlign: 'center' }}>Status</div>
        <div style={{ width: 42, textAlign: 'right', paddingRight: 2 }}>Total</div>
      </div>

      {/* ============= WORKER LIST ============= */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}>
        {filteredRows.length === 0 && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13,
          }}>
            No workers found
          </div>
        )}
        {filteredRows.map((row, idx) => {
          const statusColor = STATUS_COLORS[row.ATTENDANCE] || STATUS_COLORS['P'];
          const isLocked = isDateSaved || !canEditThisDate || row._isClosed || row._isBeforeJoining || row._isFutureDate;
          const rowId = row.id;
          const dropdownOpen = openStatusDropdown === rowId;

          return (
            <div
              key={rowId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)',
                background: row._isClosed
                  ? 'rgba(107,114,128,0.05)'
                  : dropdownOpen
                    ? 'var(--surface-2)'
                    : 'transparent',
                opacity: row._isBeforeJoining || row._isFutureDate ? 0.4 : 1,
                transition: 'background 0.1s ease',
              }}
            >
              {/* SL Number */}
              <div style={{
                width: 32,
                textAlign: 'center',
                fontSize: 10,
                color: 'var(--muted)',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {idx + 1}
              </div>

              {/* Name + subtitle */}
              <div style={{ flex: 1, paddingLeft: 6, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}>
                  {row.WORKER_NAME}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 1,
                  lineHeight: 1.3,
                }}>
                  {buildSubtitle(row)}
                </div>
              </div>

              {/* Status badge with dropdown */}
              <div style={{
                width: 54,
                textAlign: 'center',
                position: 'relative',
                flexShrink: 0,
              }}>
                {isLocked ? (
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    background: statusColor.bg,
                    color: statusColor.text,
                    minWidth: 30,
                    textAlign: 'center',
                  }}>
                    {row.ATTENDANCE || '—'}
                  </span>
                ) : (
                  <>
                    <button
                      ref={(el) => {
                        if (el) {
                          statusDropdownBtnRefs.current[rowId] = el;
                        } else {
                          delete statusDropdownBtnRefs.current[rowId];
                        }
                      }}
                      title={STATUS_OPTIONS.find((o) => o.value === row.ATTENDANCE)?.tooltip || ''}
                      onClick={() => setOpenStatusDropdown(dropdownOpen ? null : rowId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        justifyContent: 'center',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: dropdownOpen ? `2px solid ${statusColor.text}` : '2px solid transparent',
                        background: statusColor.bg,
                        color: statusColor.text,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: 'inherit',
                        minWidth: 30,
                        transition: 'border 0.1s ease',
                      }}
                    >
                      {row.ATTENDANCE || 'P'}
                      <ChevronDown size={10} />
                    </button>
                    {dropdownOpen && (
                      <div
                        ref={(el) => {
                          if (el) {
                            statusDropdownPanelRefs.current[rowId] = el;
                          } else {
                            delete statusDropdownPanelRefs.current[rowId];
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginTop: 6,
                          background: 'var(--surface)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          zIndex: 9999,
                          minWidth: 48,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                          overflow: 'hidden',
                        }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateWorkerAttendance(rowId, opt.value)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '6px 12px',
                              border: 'none',
                              background: opt.value === row.ATTENDANCE ? 'rgba(255,255,255,0.05)' : 'transparent',
                              color: opt.color,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 800,
                              textAlign: 'center',
                              fontFamily: 'inherit',
                              borderBottom: '1px solid var(--border)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = opt.value === row.ATTENDANCE
                                ? 'rgba(255,255,255,0.05)'
                                : 'transparent';
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Total */}
              <div style={{
                width: 42,
                textAlign: 'right',
                paddingRight: 2,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}>
                {row.TOTAL_DAY}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============= SAVE BAR (bottom) ============= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-strong)',
        gap: 12,
        flexShrink: 0,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          fontSize: 12,
          color: 'var(--muted)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ color: 'var(--text)' }}>
            · {totalWorkers} workers
          </span>
          <span style={{ color: 'var(--text)', fontWeight: 800 }}>
            Σ {totalDaysSum} days
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isDateSaved && !canEditThisDate && (
            <span style={{
              fontSize: 10,
              color: '#ef4444',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              ⏳ Save earlier dates first
            </span>
          )}
          <button
            onClick={saveAttendance}
            disabled={saving || isDateSaved || !canEditThisDate}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: saving || isDateSaved || !canEditThisDate
                ? 'var(--muted-2)'
                : '#0055ff',
              color: '#fff',
              cursor: saving || isDateSaved || !canEditThisDate
                ? 'not-allowed'
                : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: saving || isDateSaved || !canEditThisDate
                ? 'none'
                : '0 2px 8px rgba(0,85,255,0.3)',
            }}
          >
            <Save size={14} />
            {saving ? 'SAVING...' : isDateSaved ? 'SAVED' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AccountantDailyAttendance;