import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import AttendanceGrid from './AttendanceGrid';
import AttendanceChart from './AttendanceChart';
import DesignationView from './DesignationView';

const AttendanceHub = () => {
  const [params] = useSearchParams();
  const initialTab = params.get('tab') || 'client';
  const projectFilter = params.get('project') || '';
  const [tab, setTab] = useState(initialTab);
  const navigate = useNavigate();

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            ATTENDANCE <span style={{ color: '#0055ff' }}>SYSTEM</span>
          </h2>
        </div>
      </header>

      <div style={s.tabBar}>
        <button type="button" style={tab === 'client' ? s.tabActive : s.tab} onClick={() => setTab('client')}>
          CLIENT
        </button>
        <button type="button" style={tab === 'office' ? s.tabActive : s.tab} onClick={() => setTab('office')}>
          OFFICE (VENDORS)
        </button>
        <button type="button" style={tab === 'chart' ? s.tabActive : s.tab} onClick={() => setTab('chart')}>
          CHART
        </button>
        <button type="button" style={tab === 'designation' ? s.tabActive : s.tab} onClick={() => setTab('designation')}>
          DESIGNATION
        </button>
      </div>

      {tab === 'client' && <AttendanceGrid type="client" projectFilter={projectFilter} />}
      {tab === 'office' && <AttendanceGrid type="office" projectFilter={projectFilter} />}
      {tab === 'chart' && <AttendanceChart />}
      {tab === 'designation' && <DesignationView />}
    </div>
  );
};

export default AttendanceHub;
