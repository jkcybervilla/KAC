import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import RequestWorker from './RequestWorker';
import RegisteredWorkers from './RegisteredWorkers';

const WorkerRegisterHub = () => {
  const [tab, setTab] = useState('request');
  const navigate = useNavigate();

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            WORKER <span style={{ color: '#0055ff' }}>REGISTER</span>
          </h2>
        </div>
      </header>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        padding: '6px',
        backgroundColor: 'var(--surface)',
        borderRadius: '14px',
        border: '1px solid var(--border-strong)',
        width: 'fit-content',
      }}>
        <button
          type="button"
          onClick={() => setTab('request')}
          style={{
            padding: '14px 32px',
            borderRadius: '10px',
            border: 'none',
            background: tab === 'request' ? 'linear-gradient(135deg, #0055ff, #0033aa)' : 'transparent',
            color: tab === 'request' ? '#fff' : 'var(--muted-2)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            letterSpacing: '1px',
            transition: 'all 0.3s ease',
            boxShadow: tab === 'request' ? '0 4px 15px rgba(0,85,255,0.3)' : 'none',
          }}
        >
          📋 REQUEST WORKER
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          style={{
            padding: '14px 32px',
            borderRadius: '10px',
            border: 'none',
            background: tab === 'register' ? 'linear-gradient(135deg, #0055ff, #0033aa)' : 'transparent',
            color: tab === 'register' ? '#fff' : 'var(--muted-2)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            letterSpacing: '1px',
            transition: 'all 0.3s ease',
            boxShadow: tab === 'register' ? '0 4px 15px rgba(0,85,255,0.3)' : 'none',
          }}
        >
          👷 WORKER INFO
        </button>
      </div>

      {tab === 'request' ? <RequestWorker /> : <RegisteredWorkers />}
    </div>
  );
};

export default WorkerRegisterHub;
