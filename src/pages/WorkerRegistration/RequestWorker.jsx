import React, { useState, useEffect, useMemo } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { UserPlus, Search, X } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { nextSerial } from '../../utils/serial';

ModuleRegistry.registerModules([AllCommunityModule]);

const darkQuartzTheme = themeQuartz.withParams({
  backgroundColor: '#0a0a0a',
  foregroundColor: '#cccccc',
  headerBackgroundColor: '#111111',
  headerTextColor: '#ffffff',
  borderColor: '#222222',
  rowHoverColor: '#1a1a1a',
  oddRowBackgroundColor: '#0d0d0d',
  fontFamily: 'Inter, sans-serif',
});

const EMPTY = {
  REFFERENCE: '',
  WORKER_NAME: '',
  FATHER_NAME: '',
  DESIGNATION: 'LABOUR',
  DOB: '',
  MOBILE_NO: '',
  AADHAR_NO: '',
  AADHAR_PHOTO: '',
  JOINING_DATE_CLIENT: '',
  JOINING_DATE_OFFICE: '',
  ADDRESS: '',
  PAN_NO: '',
  PAN_PHOTO: '',
  BANK: '',
  ACCOUNT_NO: '',
  IFSC: '',
  BANK_PHOTO: '',
  PROJECT: '',
};

const RequestWorker = () => {
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    try {
      const [rSnap, pSnap, wSnap] = await Promise.all([
        getDocs(query(collection(db, 'worker_requests'), orderBy('SLNO', 'asc'))),
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'workers')),
      ]);
      setRows(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setProjects(pSnap.docs.map((d) => ({ id: d.id, name: d.data().PROJECT_NAME || d.data().name })));
      setWorkers(wSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approveRequest = async (row) => {
    const exist = workers.find((w) => String(w.AADHAR_NO) === String(row.AADHAR_NO));
    const slno = exist ? exist.SLNO : nextSerial(workers, 'SLNO');
    const empid = exist ? exist.EMPID : `KAC${String(slno).padStart(4, '0')}`;

    if (!exist) {
      await addDoc(collection(db, 'workers'), {
        SLNO: slno,
        EMPID: empid,
        REFFERENCE: row.REFFERENCE || '',
        WORKER_NAME: row.WORKER_NAME,
        FATHER_NAME: row.FATHER_NAME || '',
        DESIGNATION: row.DESIGNATION || 'LABOUR',
        DOB: row.DOB || '',
        MOBILE_NO: row.MOBILE_NO || '',
        AADHAR_NO: row.AADHAR_NO,
        JOINING_DATE_CLIENT: row.JOINING_DATE_CLIENT || '',
        JOINING_DATE_OFFICE: row.JOINING_DATE_OFFICE || '',
        ADDRESS: row.ADDRESS || '',
        PAN_NO: row.PAN_NO || '',
        PAN_PHOTO: row.PAN_PHOTO || '',
        BANK: row.BANK || '',
        ACCOUNT_NO: row.ACCOUNT_NO || '',
        IFSC: row.IFSC || '',
        BANK_PHOTO: row.BANK_PHOTO || '',
        PROJECT: row.PROJECT || '',
        STATUS: 'ACTIVE',
        timestamp: new Date(),
      });
    }

    await updateDoc(doc(db, 'worker_requests', row.id), { STATUS: 'APPROVED', EMPID: empid });
    alert(`Approved — EMP ID: ${empid}`);
    load();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const slno = nextSerial(rows, 'SLNO');
    await addDoc(collection(db, 'worker_requests'), {
      ...form,
      SLNO: slno,
      STATUS: 'PENDING',
      SOURCE: 'ADMIN',
      timestamp: new Date(),
    });
    setShowModal(false);
    setForm(EMPTY);
    load();
  };

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL NO', width: 80, pinned: 'left' },
      { field: 'REFFERENCE', headerName: 'REFERENCE', width: 120 },
      { field: 'WORKER_NAME', headerName: 'NAME', minWidth: 160, flex: 1 },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 140 },
      { field: 'DESIGNATION', headerName: 'DESIGNATION', width: 120 },
      { field: 'DOB', headerName: 'DOB', width: 110 },
      { field: 'MOBILE_NO', headerName: 'PH NUMBER', width: 120 },
      { field: 'AADHAR_NO', headerName: 'AADHAAR NO', width: 140 },
      { field: 'AADHAR_PHOTO', headerName: 'AADHAAR PHOTO', width: 120 },
      { field: 'JOINING_DATE_CLIENT', headerName: 'JOINING (CLIENT)', width: 130 },
      { field: 'JOINING_DATE_OFFICE', headerName: 'JOINING (OFFICE)', width: 130 },
      {
        headerName: 'ACTION',
        width: 110,
        pinned: 'right',
        cellRenderer: (p) =>
          p.data?.STATUS === 'APPROVED' ? (
            <span style={{ color: '#22c55e', fontSize: 10 }}>APPROVED</span>
          ) : (
            <button type="button" style={s.actionBtn} onClick={() => approveRequest(p.data)}>
              APPROVE
            </button>
          ),
      },
      {
        headerName: 'MORE',
        children: [
          { field: 'ADDRESS', headerName: 'ADDRESS', width: 180, hide: true },
          { field: 'PAN_NO', headerName: 'PAN NUMBER', width: 120, hide: true },
          { field: 'PAN_PHOTO', headerName: 'PAN PHOTO', width: 110, hide: true },
          { field: 'BANK', headerName: 'BANK', width: 100, hide: true },
          { field: 'ACCOUNT_NO', headerName: 'ACCOUNT NO', width: 120, hide: true },
          { field: 'IFSC', headerName: 'IFSC', width: 100, hide: true },
          { field: 'BANK_PHOTO', headerName: 'BANK PHOTO', width: 110, hide: true },
          { field: 'PROJECT', headerName: 'PROJECT NAME', width: 140, hide: true },
        ],
      },
    ],
    [workers]
  );

  const pendingRows = rows.filter((r) => r.STATUS !== 'APPROVED');

  if (loading) return <div style={{ color: '#666', padding: 20 }}>Loading requests...</div>;

  return (
    <div>
      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <ExportToolbar rows={pendingRows} columnDefs={columnDefs} title="Worker Requests" filename="worker-requests" />
        <button type="button" style={s.primaryBtn} onClick={() => setShowModal(true)}>
          <UserPlus size={18} /> ADD WORKER (ADMIN)
        </button>
      </div>

      <div style={s.gridSection}>
        <div style={{ height: '70vh', width: '100%' }}>
          <AgGridReact
            rowData={pendingRows}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true, filter: true, sortable: true }}
            quickFilterText={searchText}
            animateRows
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 600 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>ADD WORKER (DIRECT)</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.inputGrid}>
                <input required placeholder="AADHAAR NO" style={s.formInput} value={form.AADHAR_NO} onChange={(e) => setForm({ ...form, AADHAR_NO: e.target.value })} />
                <input required placeholder="WORKER NAME" style={s.formInput} value={form.WORKER_NAME} onChange={(e) => setForm({ ...form, WORKER_NAME: e.target.value.toUpperCase() })} />
                <input placeholder="FATHER NAME" style={s.formInput} value={form.FATHER_NAME} onChange={(e) => setForm({ ...form, FATHER_NAME: e.target.value.toUpperCase() })} />
                <input placeholder="REFERENCE" style={s.formInput} value={form.REFFERENCE} onChange={(e) => setForm({ ...form, REFFERENCE: e.target.value })} />
                <select style={s.formInput} value={form.DESIGNATION} onChange={(e) => setForm({ ...form, DESIGNATION: e.target.value })}>
                  <option value="LABOUR">LABOUR</option>
                  <option value="SKILLED">SKILLED</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                </select>
                <input type="date" placeholder="DOB" style={s.formInput} onChange={(e) => setForm({ ...form, DOB: e.target.value })} />
                <input placeholder="MOBILE" style={s.formInput} value={form.MOBILE_NO} onChange={(e) => setForm({ ...form, MOBILE_NO: e.target.value })} />
                <input type="date" placeholder="JOINING CLIENT" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_CLIENT: e.target.value })} />
                <input type="date" placeholder="JOINING OFFICE" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_OFFICE: e.target.value })} />
                <select required style={{ gridColumn: 'span 2', ...s.formInput }} value={form.PROJECT} onChange={(e) => setForm({ ...form, PROJECT: e.target.value })}>
                  <option value="">SELECT PROJECT</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" style={s.submitBtn}>
                SUBMIT REQUEST
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestWorker;