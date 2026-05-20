import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { UserPlus, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pageStyles as s } from '../../styles/pageStyles';
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
};

const AccountantWorkerRegistration = ({ projectName }) => {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rSnap, wSnap] = await Promise.all([
      getDocs(query(collection(db, 'worker_requests'), orderBy('SLNO', 'asc'))),
      getDocs(collection(db, 'workers')),
    ]);
    const all = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setRows(all.filter((r) => r.REQUESTED_BY === profile?.uid || r.PROJECT === projectName));
    setWorkers(wSnap.docs.map((d) => d.data()));
    setLoading(false);
  }, [profile, projectName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (form.AADHAR_NO.length === 12) {
      const exist = workers.find((w) => String(w.AADHAR_NO) === String(form.AADHAR_NO));
      if (exist) {
        setForm((prev) => ({
          ...prev,
          WORKER_NAME: exist.WORKER_NAME || prev.WORKER_NAME,
          FATHER_NAME: exist.FATHER_NAME || prev.FATHER_NAME,
          DESIGNATION: exist.DESIGNATION || prev.DESIGNATION,
          DOB: exist.DOB || prev.DOB,
          MOBILE_NO: exist.MOBILE_NO || prev.MOBILE_NO,
          ADDRESS: exist.ADDRESS || prev.ADDRESS,
          PAN_NO: exist.PAN_NO || prev.PAN_NO,
          BANK: exist.BANK || prev.BANK,
          ACCOUNT_NO: exist.ACCOUNT_NO || prev.ACCOUNT_NO,
          IFSC: exist.IFSC || prev.IFSC,
        }));
      }
    }
  }, [form.AADHAR_NO, workers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.JOINING_DATE_CLIENT && !form.JOINING_DATE_OFFICE) {
      alert('At least one joining date (Client or Office) is required.');
      return;
    }
    const slno = nextSerial(rows, 'SLNO');
    await addDoc(collection(db, 'worker_requests'), {
      ...form,
      SLNO: slno,
      PROJECT: projectName,
      STATUS: 'PENDING',
      REQUESTED_BY: profile.uid,
      REQUESTED_BY_NAME: profile.name,
      SOURCE: 'ACCOUNTANT',
      timestamp: new Date(),
    });
    setShowModal(false);
    setForm(EMPTY);
    load();
    alert('Worker request submitted for approval.');
  };

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL', width: 70 },
      { field: 'WORKER_NAME', headerName: 'NAME', flex: 1 },
      { field: 'REFFERENCE', headerName: 'REF', width: 100 },
      { field: 'AADHAR_NO', headerName: 'AADHAAR', width: 130 },
      { field: 'DESIGNATION', headerName: 'DESIG', width: 100 },
      {
        field: 'STATUS',
        headerName: 'APPROVAL',
        width: 110,
        cellStyle: (p) => ({ color: p.value === 'APPROVED' ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }),
      },
    ],
    []
  );

  if (!projectName) return <p style={{ color: '#666' }}>Select a project from the header.</p>;
  if (loading) return <p style={{ color: '#666' }}>Loading...</p>;

  return (
    <>
      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <button type="button" style={s.primaryBtn} onClick={() => setShowModal(true)}>
          <UserPlus size={18} /> ADD WORKER
        </button>
      </div>
      <div style={s.gridSection}>
        <div style={{ height: '55vh', width: '100%' }}>
          <AgGridReact rowData={rows} columnDefs={columnDefs} defaultColDef={{ filter: true }} quickFilterText={searchText} theme={darkQuartzTheme} />
        </div>
      </div>

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 560 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>ADD WORKER</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <input required placeholder="REFERENCE *" style={s.formInput} value={form.REFFERENCE} onChange={(e) => setForm({ ...form, REFFERENCE: e.target.value })} />
              <input required placeholder="AADHAAR NO (12 digit) *" style={s.formInput} value={form.AADHAR_NO} onChange={(e) => setForm({ ...form, AADHAR_NO: e.target.value })} />
              <input required placeholder="NAME *" style={s.formInput} value={form.WORKER_NAME} onChange={(e) => setForm({ ...form, WORKER_NAME: e.target.value.toUpperCase() })} />
              <input required placeholder="FATHER NAME *" style={s.formInput} value={form.FATHER_NAME} onChange={(e) => setForm({ ...form, FATHER_NAME: e.target.value.toUpperCase() })} />
              <select style={s.formInput} value={form.DESIGNATION} onChange={(e) => setForm({ ...form, DESIGNATION: e.target.value })}>
                <option value="LABOUR">LABOUR</option>
                <option value="SKILLED">SKILLED</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
              </select>
              <input required type="date" style={s.formInput} onChange={(e) => setForm({ ...form, DOB: e.target.value })} />
              <input required placeholder="PH NUMBER *" style={s.formInput} value={form.MOBILE_NO} onChange={(e) => setForm({ ...form, MOBILE_NO: e.target.value })} />
              <input required placeholder="AADHAAR PHOTO URL *" style={s.formInput} value={form.AADHAR_PHOTO} onChange={(e) => setForm({ ...form, AADHAR_PHOTO: e.target.value })} />
              <input required placeholder="ADDRESS *" style={s.formInput} value={form.ADDRESS} onChange={(e) => setForm({ ...form, ADDRESS: e.target.value })} />
              <input type="date" placeholder="JOINING CLIENT" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_CLIENT: e.target.value })} />
              <input type="date" placeholder="JOINING OFFICE" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_OFFICE: e.target.value })} />
              <input placeholder="PAN (optional)" style={s.formInput} onChange={(e) => setForm({ ...form, PAN_NO: e.target.value })} />
              <input placeholder="BANK (optional)" style={s.formInput} onChange={(e) => setForm({ ...form, BANK: e.target.value })} />
              <button type="submit" style={s.submitBtn}>SUBMIT REQUEST</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountantWorkerRegistration;
