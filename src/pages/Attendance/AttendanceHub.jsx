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

  const headerTabBtn = (isActive) => ({
    padding: '14px 24px',
    borderRadius: '10px',
    border: isActive ? '2px solid #0055ff' : '2px solid transparent',
    background: isActive ? 'rgba(0,85,255,0.12)' : 'var(--surface)',
    color: isActive ? '#fff' : 'var(--muted)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 0 20px rgba(0,85,255,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
  });

  const handleTabHover = (e, enter) => {
    e.target.style.transform = enter ? 'scale(1.05)' : 'scale(1)';
    e.target.style.background = enter
      ? 'rgba(0,85,255,0.2)'
      : e.target.dataset.active === 'true'
        ? 'rgba(0,85,255,0.12)'
        : 'var(--surface)';
  };

  return (
    <div style={s.container}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            data-active={tab === 'client'}
            style={headerTabBtn(tab === 'client')}
            onClick={() => setTab('client')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
            CLIENT
          </button>
          <button
            type="button"
            data-active={tab === 'office'}
            style={headerTabBtn(tab === 'office')}
            onClick={() => setTab('office')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
            OFFICE (VENDORS)
          </button>
          <button
            type="button"
            data-active={tab === 'chart'}
            style={headerTabBtn(tab === 'chart')}
            onClick={() => setTab('chart')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
            CHART
          </button>
          <button
            type="button"
            data-active={tab === 'designation'}
            style={headerTabBtn(tab === 'designation')}
            onClick={() => setTab('designation')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
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