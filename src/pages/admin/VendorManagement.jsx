import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ArrowLeft, Plus, Edit2, X, Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const now = new Date();
const CURRENT_MONTH = String(now.getMonth() + 1).padStart(2, '0');
const CURRENT_YEAR = String(now.getFullYear());

const VendorManagement = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [formData, setFormData] = useState({
    vendorName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNo: '',
    monthlyManpower: '',
    monthlyBoq: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);

  // Generate year options (current year - 5 to current year + 2)
  const yearOptions = [];
  const startYear = parseInt(CURRENT_YEAR) - 5;
  const endYear = parseInt(CURRENT_YEAR) + 2;
  for (let y = startYear; y <= endYear; y++) {
    yearOptions.push(String(y));
  }

  const getMonthKey = (month, year) => `${year}-${month}`;

  // Get monthly data for a vendor
  const getMonthlyData = (vendor, month, year) => {
    const key = getMonthKey(month, year);
    return (vendor.monthlyData && vendor.monthlyData[key]) || {};
  };

  const loadVendors = async () => {
    try {
      const snap = await getDocs(collection(db, 'vendors'));
      setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Load vendors error:', err);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const openCreateModal = () => {
    setEditingVendor(null);
    setFormData({
      vendorName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNo: '',
      monthlyManpower: '',
      monthlyBoq: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    const monthData = getMonthlyData(vendor, selectedMonth, selectedYear);
    setFormData({
      vendorName: vendor.vendorName || '',
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gstNo: vendor.gstNo || '',
      monthlyManpower: monthData.activeWorker !== undefined ? String(monthData.activeWorker) : '',
      monthlyBoq: monthData.totalBoq !== undefined ? String(monthData.totalBoq) : '',
      status: vendor.status || 'active',
    });
    setShowModal(true);
  };

  const handlePrevMonth = () => {
    let m = parseInt(selectedMonth) - 1;
    let y = parseInt(selectedYear);
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const handleNextMonth = () => {
    let m = parseInt(selectedMonth) + 1;
    let y = parseInt(selectedYear);
    if (m > 12) { m = 1; y++; }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const monthKey = getMonthKey(selectedMonth, selectedYear);
      const monthlyUpdate = {
        [`monthlyData.${monthKey}`]: {
          activeWorker: formData.monthlyManpower ? Number(formData.monthlyManpower) : 0,
          totalBoq: formData.monthlyBoq ? Number(formData.monthlyBoq) : 0,
          updatedAt: new Date(),
        },
      };

      if (editingVendor) {
        await updateDoc(doc(db, 'vendors', editingVendor.id), {
          vendorName: formData.vendorName,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          gstNo: formData.gstNo,
          status: formData.status,
          ...monthlyUpdate,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, 'vendors'), {
          vendorName: formData.vendorName,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          gstNo: formData.gstNo,
          status: formData.status,
          monthlyData: {
            [monthKey]: {
              activeWorker: formData.monthlyManpower ? Number(formData.monthlyManpower) : 0,
              totalBoq: formData.monthlyBoq ? Number(formData.monthlyBoq) : 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      setShowModal(false);
      loadVendors();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter((v) =>
    (v.vendorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.phone || '').includes(searchTerm)
  );

  const activeVendors = filteredVendors.filter((v) => v.status !== 'inactive');
  const inactiveVendors = filteredVendors.filter((v) => v.status === 'inactive');

  const currentMonthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            VENDOR <span style={{ color: '#0055ff' }}>MANAGEMENT</span>
          </h2>
        </div>
        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <Search size={14} color="#666" />
            <input
              type="text"
              placeholder="Search vendors..."
              style={s.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={openCreateModal} style={s.primaryBtn}>
            <Plus size={16} /> ADD VENDOR
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #111' }}>
          <small style={{ color: '#666', fontSize: 10, fontWeight: 'bold' }}>TOTAL VENDORS</small>
          <h3 style={{ margin: '8px 0 0', fontSize: 28 }}>{vendors.length}</h3>
        </div>
        <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #111' }}>
          <small style={{ color: '#666', fontSize: 10, fontWeight: 'bold' }}>ACTIVE VENDORS</small>
          <h3 style={{ margin: '8px 0 0', fontSize: 28, color: '#22c55e' }}>{vendors.filter((v) => v.status !== 'inactive').length}</h3>
        </div>
        <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #111' }}>
          <small style={{ color: '#666', fontSize: 10, fontWeight: 'bold' }}>TOTAL MANPOWER ({currentMonthLabel})</small>
          <h3 style={{ margin: '8px 0 0', fontSize: 28, color: '#22c55e' }}>
            {activeVendors.reduce((sum, v) => {
              const d = getMonthlyData(v, selectedMonth, selectedYear);
              return sum + (d.activeWorker || 0);
            }, 0)}
          </h3>
        </div>
        <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #111' }}>
          <small style={{ color: '#666', fontSize: 10, fontWeight: 'bold' }}>TOTAL BOQ ({currentMonthLabel})</small>
          <h3 style={{ margin: '8px 0 0', fontSize: 28, color: '#f59e0b' }}>
            ₹{activeVendors.reduce((sum, v) => {
              const d = getMonthlyData(v, selectedMonth, selectedYear);
              return sum + (d.totalBoq || 0);
            }, 0).toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Active Vendors */}
      <div style={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #111', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>ACTIVE VENDORS <span style={{ color: '#666', fontWeight: 'normal' }}>({activeVendors.length})</span></h3>
          
          {/* Month / Year Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handlePrevMonth} style={pickerBtnStyle}>
              <ChevronLeft size={16} />
            </button>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={pickerSelectStyle}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={pickerSelectStyle}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            
            <button onClick={handleNextMonth} style={pickerBtnStyle}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {activeVendors.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#555' }}>
            <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No active vendors found. Click "ADD VENDOR" to add one.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111', color: '#666', textAlign: 'left' }}>
                <th style={{ ...thStyle, width: 50, textAlign: 'center' }}>SL</th>
                <th style={thStyle}>VENDOR NAME</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>ACTIVE MANPOWER<br /><span style={{ fontSize: 9, fontWeight: 'normal', color: '#555' }}>({currentMonthLabel})</span></th>
                <th style={{ ...thStyle, textAlign: 'center' }}>TOTAL BOQ<br /><span style={{ fontSize: 9, fontWeight: 'normal', color: '#555' }}>({currentMonthLabel})</span></th>
                <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {activeVendors.map((v, index) => {
                const monthData = getMonthlyData(v, selectedMonth, selectedYear);
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #111', transition: '0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#555' }}>{index + 1}</td>
                    <td style={tdStyle}>
                      <strong>{v.vendorName}</strong>
                      <br />
                      <span style={{ color: '#555', fontSize: 10 }}>{v.contactPerson}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 14 }}>
                        {monthData.activeWorker || 0}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 14 }}>
                        ₹{(monthData.totalBoq || 0).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => openEditModal(v)} style={{ background: 'none', border: '1px solid #222', color: '#0055ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                        VIEW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inactive Vendors */}
      {inactiveVendors.length > 0 && (
        <div style={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #1a1a1a', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#666' }}>INACTIVE VENDORS <span style={{ color: '#444' }}>({inactiveVendors.length})</span></h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a', color: '#555', textAlign: 'left' }}>
                <th style={thStyle}>VENDOR NAME</th>
                <th style={thStyle}>CONTACT</th>
                <th style={thStyle}>PHONE</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {inactiveVendors.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #1a1a1a', opacity: 0.6 }}>
                  <td style={tdStyle}>
                    <strong>{v.vendorName}</strong>
                    <br />
                    <span style={{ color: '#555', fontSize: 10 }}>{v.contactPerson}</span>
                  </td>
                  <td style={tdStyle}>{v.email || '-'}</td>
                  <td style={tdStyle}>{v.phone || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button onClick={() => openEditModal(v)} style={{ background: 'none', border: '1px solid #222', color: '#0055ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, color: '#0055ff' }}>
                {editingVendor ? `EDIT: ${editingVendor.vendorName}` : 'ADD NEW VENDOR'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.inputGrid}>
                <div>
                  <label style={s.label}>VENDOR NAME *</label>
                  <input type="text" style={s.formInput} value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} required />
                </div>
                <div>
                  <label style={s.label}>CONTACT PERSON</label>
                  <input type="text" style={s.formInput} value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>PHONE *</label>
                  <input type="text" style={s.formInput} value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
                <div>
                  <label style={s.label}>EMAIL</label>
                  <input type="email" style={s.formInput} value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={s.label}>ADDRESS</label>
                  <input type="text" style={s.formInput} value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>GST NO.</label>
                  <input type="text" style={s.formInput} value={formData.gstNo}
                    onChange={(e) => setFormData({ ...formData, gstNo: e.target.value })} />
                </div>
              </div>

              {/* Monthly Data Section */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 16, marginTop: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 12, color: '#0055ff' }}>
                  {currentMonthLabel} {selectedYear} — Monthly Data
                </h4>
                <div style={s.inputGrid}>
                  <div>
                    <label style={s.label}>ACTIVE MANPOWER</label>
                    <input type="number" min="0" style={s.formInput} 
                      placeholder="Number of workers"
                      value={formData.monthlyManpower}
                      onChange={(e) => setFormData({ ...formData, monthlyManpower: e.target.value })} />
                  </div>
                  <div>
                    <label style={s.label}>TOTAL BOQ (₹)</label>
                    <input type="number" min="0" step="0.01" style={s.formInput}
                      placeholder="e.g. 50000"
                      value={formData.monthlyBoq}
                      onChange={(e) => setFormData({ ...formData, monthlyBoq: e.target.value })} />
                  </div>
                </div>
              </div>

              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? 'SAVING...' : editingVendor ? 'UPDATE VENDOR' : 'ADD VENDOR'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = {
  padding: '12px 16px',
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: 12,
};

const pickerBtnStyle = {
  background: '#111',
  border: '1px solid #222',
  color: '#fff',
  borderRadius: '6px',
  cursor: 'pointer',
  padding: '6px 8px',
  display: 'flex',
  alignItems: 'center',
};

const pickerSelectStyle = {
  backgroundColor: '#111',
  border: '1px solid #222',
  color: '#fff',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
};

export default VendorManagement;
