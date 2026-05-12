import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './AdminDashboard'; // আপনার তৈরি করা আসল ফাইল
import ProjectDetails from './ProjectDetails';
import AccountantDashboard from './AccountantDashboard'; // আপনার তৈরি করা আসল ফাইল
import WorkerRegistration from './WorkerRegistration';
// Routes এর ভেতর
<Route path="/register-worker" element={<WorkerRegistration />} />
/**
 * কো-অর্ডিনেটর এখনো তৈরি না হওয়ায় এটি আপাতত ডামি রাখা হলো।
 */
const DummyCoordinator = () => (
  <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial' }}>
    <h1>Coordinator Dashboard</h1>
    <p>This section is under construction.</p>
    <button onClick={() => window.location.href = '/'}>LOGOUT</button>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* লগইন রাউট */}
        <Route path="/" element={<Login />} />

        {/* আসল ড্যাশবোর্ড ফাইলগুলো এখানে কানেক্ট করা হলো */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/accountant" element={<AccountantDashboard />} />
        
        {/* কো-অর্ডিনেটর ডামি হিসেবে থাকলো */}
        <Route path="/coordinator" element={<DummyCoordinator />} />

        {/* ভুল ইউআরএল টাইপ করলে লগইন পেজে পাঠিয়ে দিবে */}
        <Route path="/project/:id" element={<ProjectDetails />} />
      </Routes>
    </Router>
  );
}

export default App;