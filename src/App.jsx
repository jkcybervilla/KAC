import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import AdminDashboard from './pages/admin/AdminDashboard'; 
import ProjectDetails from './pages/project/ProjectDetails';
import ProjectsPage from './pages/project/ProjectsPage';
import AccountantDashboard from './pages/accountant/AccountantDashboard'; 
import WorkerRegisterHub from './pages/WorkerRegistration/WorkerRegisterHub';
import AttendanceHub from './pages/Attendance/AttendanceHub';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/accountant" element={<AccountantDashboard />} />
        <Route path="/all-projects" element={<ProjectsPage />} />
        <Route path="/project/:id" element={<ProjectDetails />} />
        <Route path="/attendance-sheet" element={<AttendanceHub />} />
        <Route path="/register-worker" element={<WorkerRegisterHub />} />
      </Routes>
    </Router>
  );
}

export default App;