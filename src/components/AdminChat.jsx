import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Send, MessageSquare, User, Shield, ChevronDown } from 'lucide-react';

const AdminChat = ({ user, recipientRole = 'admin' }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Single shared chat room for all users
  const chatId = 'general-chat-room';

  useEffect(() => {
    if (!user?.uid) return;
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));

      // Accountant cannot see messages from other accountants
      // They can only see their own messages + messages from other roles
      if (user?.role === 'accountant') {
        msgs = msgs.filter(
          msg => msg.senderRole !== 'accountant' || msg.senderId === user.uid
        );
      }

      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('Chat fetch error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.uid) return;

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: user.name || user.email || 'Unknown',
        senderRole: user.role || 'accountant',
        message: newMessage.trim(),
        timestamp: Timestamp.now(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#0055ff';
      case 'accountant': return '#22c55e';
      case 'coordinator': return '#f59e0b';
      default: return 'var(--muted-2)';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield size={12} />;
      default: return <User size={12} />;
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = msg.timestamp.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div style={styles.container}>
      <style>{`
        .chat-messages { flex: 1; overflow-y: auto; padding: 16px; }
        .chat-messages::-webkit-scrollbar { width: 5px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
        .chat-input:focus { outline: none; border-color: #0055ff !important; }
      `}</style>

      {/* Chat Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={styles.headerIcon}>
            <MessageSquare size={16} color="#0055ff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>General Chat</h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#22c55e' }}>
              {loading ? 'Connecting...' : '● Online'}
            </p>
          </div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--muted-2)' }}>
          {messages.length} messages
        </span>
      </div>

      {/* Messages Area */}
      <div className="chat-messages" style={styles.messagesArea}>
        {loading ? (
          <div style={styles.loadingState}>
            <MessageSquare size={32} color="var(--muted-2)" style={{ marginBottom: 8 }} />
            <p style={{ color: 'var(--muted-2)', fontSize: '13px' }}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.emptyState}>
            <MessageSquare size={40} color="var(--muted-2)" style={{ marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--text)' }}>No messages yet</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-2)', textAlign: 'center' }}>
              Start a conversation with the admin. Your messages will be visible here.
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div style={styles.dateDivider}>
                <span style={styles.dateText}>{date}</span>
              </div>
              {msgs.map((msg) => {
                const isOwn = msg.senderId === user?.uid;
                return (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        ...styles.messageBubble,
                        backgroundColor: isOwn ? '#0055ff' : 'var(--surface-2)',
                        color: isOwn ? '#fff' : 'var(--text)',
                        borderBottomRightRadius: isOwn ? '4px' : '12px',
                        borderBottomLeftRadius: isOwn ? '12px' : '4px',
                      }}
                    >
                      {!isOwn && (
                        <div style={styles.senderInfo}>
                          <span style={{ ...styles.senderName, color: getRoleColor(msg.senderRole) }}>
                            {getRoleIcon(msg.senderRole)}
                            {msg.senderName}
                          </span>
                          <span style={styles.roleBadge(getRoleColor(msg.senderRole))}>
                            {msg.senderRole?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p style={styles.messageText}>{msg.message}</p>
                      <div style={styles.messageFooter}>
                        <span style={styles.timeText}>
                          {msg.timestamp?.toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        {isOwn && <span style={styles.sentIndicator}>✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={styles.inputArea}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
          className="chat-input"
          style={styles.input}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          style={{
            ...styles.sendBtn,
            opacity: newMessage.trim() ? 1 : 0.5,
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--surface)',
    borderRadius: '15px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    maxHeight: 'calc(100vh - 200px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  headerIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#0055ff15',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    backgroundColor: 'var(--bg)',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px 20px',
  },
  dateDivider: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
    marginTop: '16px',
  },
  dateText: {
    fontSize: '11px',
    color: 'var(--muted-2)',
    backgroundColor: 'var(--surface)',
    padding: '4px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  },
  messageRow: {
    display: 'flex',
    marginBottom: '8px',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: '12px',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    position: 'relative',
  },
  senderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  senderName: {
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  roleBadge: (color) => ({
    fontSize: '9px',
    padding: '1px 6px',
    borderRadius: '8px',
    backgroundColor: color + '20',
    color: color,
    fontWeight: '600',
  }),
  messageText: {
    margin: '0',
    fontSize: '13px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  timeText: {
    fontSize: '10px',
    opacity: 0.7,
  },
  sentIndicator: {
    fontSize: '10px',
    opacity: 0.8,
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-strong)',
    backgroundColor: 'var(--surface-3)',
    color: 'var(--text)',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#0055ff',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
};

export default AdminChat;