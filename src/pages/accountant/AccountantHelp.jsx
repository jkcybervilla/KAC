import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { HelpCircle, ChevronDown, ChevronUp, UserPlus, Calendar, ClipboardList, FileText, Phone, Mail, Send, CheckCircle } from 'lucide-react';

const guideData = [
  {
    icon: UserPlus,
    title: 'Worker Registration',
    color: '#2563eb',
    steps: [
      'Click "Add" to start the 4-step wizard.',
      'Step 1 — Select a vendor (reference) and fill joining dates.',
      'Step 2 — Enter personal details: Aadhaar, name, father name, DOB, phone, address.',
      'Step 3 — Add bank details (optional — can skip).',
      'Step 4 — Upload worker photo, Aadhaar front/back, and optional documents.',
      'Submit — The request goes to Admin for approval.',
      'After approval, the worker is added and gets an EMP ID.',
    ],
  },
  {
    icon: Calendar,
    title: 'Attendance',
    color: '#22c55e',
    steps: [
      'Select Client or Office attendance from the sidebar.',
      'Mark each worker as P (Present), A (Absent), H (Holiday), or C (Client Site).',
      'Saves are sequential — each day\'s attendance is saved independently.',
      'Use the date picker to view or mark attendance for past dates.',
      'Stats are shown per month batch in the top summary.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Work Activity',
    color: '#f59e0b',
    steps: [
      'Go to WORK ACTIVITY from the sidebar menu.',
      'Switch between ACTIVITY and JMC tabs.',
      'Click "SEND ACTIVITY" to log daily work — select Mistri, work type, manpower, and details.',
      'Click "SEND JMC" to submit measurement records with quantities.',
      'All entries are saved to the project and viewable in the list.',
    ],
  },
  {
    icon: FileText,
    title: 'DPR (Daily Progress Report)',
    color: '#8b5cf6',
    steps: [
      'DPR shows a summary of all work activities for the project.',
      'It combines attendance, work logs, and JMC entries.',
      'Use it to get a quick overview of daily progress.',
      'Data is automatically pulled from your entries.',
    ],
  },
];

const faqData = [
  {
    q: "Why can't I edit a previous date's attendance?",
    a: 'Attendance records are locked after submission to maintain data integrity. Once a day is saved, it becomes read-only to prevent accidental or unauthorized changes. If you need to correct an error, contact the admin who can override it at the database level.',
  },
  {
    q: 'What does each status (P/A/H/C) mean?',
    a: 'P = Present (worker was on site). A = Absent (worker was not present). H = Holiday (scheduled off day or public holiday). C = Client Site (worker was deployed at a client location instead of the office). These statuses are used for both Client and Office attendance.',
  },
  {
    q: 'How do I edit worker details after submission?',
    a: 'Open the worker details by clicking the eye icon next to their name. Click the "Edit" button in the details modal. Fill in the blank fields (pre-filled fields are read-only). On save, the worker status resets to PENDING for admin review and approval.',
  },
  {
    q: 'Why is my worker request still pending?',
    a: 'Worker registration requests require admin approval before the worker is officially added to the system. The admin reviews the submitted details and either approves or rejects the request. Check the status badge on the worker list — green means approved, yellow means pending.',
  },
  {
    q: 'How do I download attendance reports?',
    a: 'While viewing Client or Office attendance, click the three-dot menu (⋮) in the top-right header. Select "Download" to open the export toolbar. From there you can export to Excel, PDF, or print the attendance data for the current month batch.',
  },
];

const SectionHeader = ({ icon: Icon, title, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
  </div>
);

const AccordionItem = ({ question, answer, open, onToggle }) => (
  <div style={{ borderBottom: '1px solid var(--border)' }}>
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text)',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'left',
        fontFamily: 'inherit',
        gap: 12,
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.4 }}>{question}</span>
      {open ? <ChevronUp size={16} style={{ flexShrink: 0, color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ flexShrink: 0, color: 'var(--muted)' }} />}
    </button>
    {open && (
      <div style={{ padding: '0 0 14px 0', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7 }}>
        {answer}
      </div>
    )}
  </div>
);

const AccountantHelp = ({ projectName }) => {
  const { profile } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sending, setSending] = useState(false);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleSendFeedback = async () => {
    if (!feedback.trim()) {
      alert('Please enter your feedback before submitting.');
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, 'accountant_feedback'), {
        message: feedback.trim(),
        projectName: projectName || '',
        profileName: profile?.name || profile?.email || 'Unknown',
        timestamp: serverTimestamp(),
      });
      setFeedback('');
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 4000);
    } catch (err) {
      alert('Error sending feedback: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: 700, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Page heading hidden — header will show "HELP" from MENU label */}

      {/* ── Quick Guide ── */}
      <SectionHeader icon={HelpCircle} title="Quick Guide" color="#0055ff" />
      <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
        {guideData.map((item, idx) => (
          <div key={idx} style={{ padding: 18, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <item.icon size={18} color={item.color} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.title}</span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {item.steps.map((step, si) => (
                <li key={si} style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6 }}>{step}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── FAQ ── */}
      <SectionHeader icon={HelpCircle} title="Frequently Asked Questions" color="#f59e0b" />
      <div style={{ padding: '0 16px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 32 }}>
        {faqData.map((item, idx) => (
          <AccordionItem
            key={idx}
            question={item.q}
            answer={item.a}
            open={openFaq === idx}
            onToggle={() => toggleFaq(idx)}
          />
        ))}
      </div>

      {/* ── Contact / Support ── */}
      <SectionHeader icon={HelpCircle} title="Contact & Support" color="#22c55e" />
      <div style={{ padding: 20, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--accent-soft)' }}>
          <Phone size={18} color="#0055ff" />
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>+91-XXXXXXXXXX</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: 'var(--accent-soft)' }}>
          <Mail size={18} color="#0055ff" />
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>support@kac.com</span>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Send Feedback</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--muted)' }}>
            Have suggestions or found an issue? Let us know and we'll look into it.
          </p>
          <textarea
            placeholder="Type your feedback here..."
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 12,
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleSendFeedback}
              disabled={sending || !feedback.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: '#0055ff',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: sending || !feedback.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !feedback.trim() ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              <Send size={14} />
              {sending ? 'Sending...' : 'Send Feedback'}
            </button>
            {feedbackSent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                <CheckCircle size={14} />
                Thank you! Feedback sent.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantHelp;