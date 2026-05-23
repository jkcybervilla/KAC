import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import WorkActivity from './WorkActivity';
import DprView from './DprView';
import JmcView from './JmcView';

const WorkActivityHub = () => {
  const [tab, setTab] = useState('activity');
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
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            WORK ACTIVITY <span style={{ color: '#0055ff' }}>HUB</span>
          </h2>
        </div>
        <div style={s.headerRight}>
          <button
            type="button"
            data-active={tab === 'activity'}
            style={headerTabBtn(tab === 'activity')}
            onClick={() => setTab('activity')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
            WORK ACTIVITY
          </button>
          <button
            type="button"
            data-active={tab === 'dpr'}
            style={headerTabBtn(tab === 'dpr')}
            onClick={() => setTab('dpr')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
            DPR
          </button>
          <button
            type="button"
            data-active={tab === 'jmc'}
            style={headerTabBtn(tab === 'jmc')}
            onClick={() => setTab('jmc')}
            onMouseEnter={(e) => handleTabHover(e, true)}
            onMouseLeave={(e) => handleTabHover(e, false)}
          >
            JMC
          </button>
        </div>
      </header>

      {tab === 'activity' && <WorkActivity />}
      {tab === 'dpr' && <DprView />}
      {tab === 'jmc' && <JmcView />}
    </div>
  );
};

export default WorkActivityHub;