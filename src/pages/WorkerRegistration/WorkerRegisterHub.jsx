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

      <div style={s.tabBar}>
        <button type="button" style={tab === 'request' ? s.tabActive : s.tab} onClick={() => setTab('request')}>
          REQUEST WORKER
        </button>
        <button type="button" style={tab === 'register' ? s.tabActive : s.tab} onClick={() => setTab('register')}>
          WORKER REGISTER
        </button>
      </div>

      {tab === 'request' ? <RequestWorker /> : <RegisteredWorkers />}
    </div>
  );
};

export default WorkerRegisterHub;
