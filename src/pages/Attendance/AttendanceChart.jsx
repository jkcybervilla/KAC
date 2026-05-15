import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { pageStyles as s } from '../../styles/pageStyles';
import { getBatchId, countPresent, getDaysInMonth } from '../../utils/attendance';

const COLORS = ['#0055ff', '#22c55e', '#ef4444', '#f59e0b'];

const AttendanceChart = () => {
  const [client, setClient] = useState([]);
  const [office, setOffice] = useState([]);

  const now = new Date();
  const batchId = getBatchId(now.getMonth() + 1, now.getFullYear());
  const days = getDaysInMonth(now.getMonth() + 1, now.getFullYear());

  useEffect(() => {
    (async () => {
      const [c, o] = await Promise.all([
        getDocs(collection(db, 'attendance_client')),
        getDocs(collection(db, 'attendance_office')),
      ]);
      setClient(c.docs.map((d) => d.data()).filter((r) => r.batchId === batchId));
      setOffice(o.docs.map((d) => d.data()).filter((r) => r.batchId === batchId));
    })();
  }, [batchId]);

  const clientPresent = client.reduce((sum, r) => sum + countPresent(r.days || {}, days), 0);
  const officePresent = office.reduce((sum, r) => sum + countPresent(r.days || {}, days), 0);

  const compareData = useMemo(
    () => [
      { name: 'Client', present: clientPresent, workers: client.length },
      { name: 'Office', present: officePresent, workers: office.length },
    ],
    [clientPresent, officePresent, client.length, office.length]
  );

  const pieData = useMemo(() => {
    const byDes = {};
    client.forEach((r) => {
      const d = r.DESIGNATION || 'OTHER';
      byDes[d] = (byDes[d] || 0) + countPresent(r.days || {}, days);
    });
    return Object.entries(byDes).map(([name, value]) => ({ name, value }));
  }, [client, days]);

  return (
    <div>
      <div style={s.chartBox}>
        <h3 style={{ marginTop: 0 }}>Client vs Office — Present Days ({batchId})</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={compareData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
            <Legend />
            <Bar dataKey="present" fill="#0055ff" name="Present Days" />
            <Bar dataKey="workers" fill="#22c55e" name="Workers" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={s.chartBox}>
        <h3 style={{ marginTop: 0 }}>Designation-wise Present (Client)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AttendanceChart;
