import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [waStatus, setWaStatus] = useState({ connected: false, qrCode: null });
  const [employees, setEmployees] = useState([]);
  const [responses, setResponses] = useState([]);
  const [blasts, setBlasts] = useState([]);
  const [newEmp, setNewEmp] = useState({ name: '', phone_number: '' });
  const [scheduleDate, setScheduleDate] = useState('2026-09-01');

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/whatsapp/status`);
      setWaStatus(res.data);
    } catch (e) { console.error('Status fetch error', e); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/employees`);
      setEmployees(res.data);
    } catch (e) { console.error('Emp fetch error', e); }
  };

  const fetchResponses = async () => {
    try {
      const res = await axios.get(`${API_URL}/responses`);
      setResponses(res.data);
    } catch (e) { console.error('Resp fetch error', e); }
  };

  const fetchBlasts = async () => {
      try {
          const res = await axios.get(`${API_URL}/blasts`);
          setBlasts(res.data);
      } catch (e) { console.error('Blasts fetch error', e); }
  };

  useEffect(() => {
    fetchStatus();
    fetchEmployees();
    fetchResponses();
    fetchBlasts();
    const interval = setInterval(() => {
        fetchStatus();
        fetchBlasts();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addEmployee = async (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.phone_number) return;
    try {
      await axios.post(`${API_URL}/employees`, newEmp);
      setNewEmp({ name: '', phone_number: '' });
      fetchEmployees();
    } catch (e) { alert('Error adding employee'); }
  };

  const deleteEmployee = async (id) => {
    if (window.confirm("Are you sure you want to remove this employee?")) {
        try {
            await axios.delete(`${API_URL}/employees/${id}`);
            fetchEmployees();
        } catch (e) { alert('Error deleting employee'); }
    }
  };

  const deleteBlast = async (id) => {
      if(window.confirm('Delete this scheduled blast?')) {
          await axios.delete(`${API_URL}/blasts/${id}`);
          fetchBlasts();
      }
  };

  const sendTestBlast = async () => {
    const phone = prompt('Enter a 10-digit phone number to test the automated message blast (e.g. 1234567890):');
    if (phone) {
        try {
            await axios.post(`${API_URL}/whatsapp/test`, { phone, message: 'Test: Please let me know your availability for the upcoming schedule. Can you send me your hours?' });
            alert('Message sent successfully!');
        } catch(e) { alert('Failed to send message. Make sure WhatsApp is connected.'); }
    }
  };

  const [aiSchedule, setAiSchedule] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const autoGenerateSchedule = async () => {
      if (employees.length === 0 || responses.length === 0) {
          alert("You need employees and inbox responses first before the AI can generate a schedule.");
          return;
      }
      setIsGenerating(true);
      try {
          const res = await axios.post(`${API_URL}/generate-schedule`, { employees, responses });
          // Format array into a map by employee_id for easy rendering
          const scheduleMap = {};
          res.data.forEach(s => scheduleMap[s.employee_id] = s);
          setAiSchedule(scheduleMap);
      } catch (e) {
          alert('Error generating schedule: ' + e.message);
      }
      setIsGenerating(false);
  };

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      
      {/* Sidebar */}
      <div className="sidebar" style={{ width: isSidebarOpen ? '260px' : '60px', overflow: 'hidden', transition: 'width 0.3s ease' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h1 style={{ display: isSidebarOpen ? 'flex' : 'none', alignItems: 'center', gap: '15px', fontSize: '1.4rem', margin: '20px 0', lineHeight: '1.2' }}>
                <img src="https://images.squarespace-cdn.com/content/v1/679bcf973d2ff5007b0a42a3/1b29a792-49aa-42bb-b46d-d0632ae459eb/favicon.ico?format=100w" alt="Blue Parrot" style={{width: '80px', height: '80px', borderRadius: '8px'}} />
                <div>Blue Parrot<br/>Schedule</div>
            </h1>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{background: 'transparent', color: 'white', padding: '5px', fontSize: '1.2rem'}}>
                {isSidebarOpen ? '◀' : '▶'}
            </button>
        </div>
        
        <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          {isSidebarOpen ? 'Dashboard' : '📊'}
        </div>
        <div className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
          {isSidebarOpen ? 'Team Directory' : '👥'}
        </div>
        <div className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
          {isSidebarOpen ? 'Availability Inbox' : '📥'}
        </div>
        <div className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
          {isSidebarOpen ? '📅 Master Schedule' : '📅'}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h2>{activeTab === 'overview' ? 'Overview' : activeTab === 'employees' ? 'Manage Team' : activeTab === 'inbox' ? 'Inbox' : 'Master Schedule'}</h2>
          <p>Automate your scheduling process effortlessly.</p>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid-2">
            <div className="card">
              <h3>WhatsApp Connection</h3>
              {waStatus.connected ? (
                <div>
                    <span className="status-badge status-connected">✓ Connected</span>
                    <p style={{marginTop: '15px', color: '#667781'}}>Your phone is successfully linked. Automated messages will run on the 14th and 30th of every month.</p>
                </div>
              ) : waStatus.qrCode ? (
                <div className="qr-container">
                  <span className="status-badge status-disconnected">⚠ Action Required</span>
                  <p>Scan this QR code with your WhatsApp app (Settings &gt; Linked Devices):</p>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                      <QRCode value={waStatus.qrCode} size={150} />
                  </div>
                </div>
              ) : (
                <p>Initializing WhatsApp Client... Please wait.</p>
              )}
            </div>

            <div className="card">
              <h3>Quick Actions & Scheduling</h3>
              <p>Test the system or schedule a custom blast for any date and time.</p>
              
              <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                <button onClick={sendTestBlast} style={{flex: 1}}>▶ Run Test Blast Now</button>
              </div>

              <div style={{padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid var(--primary)'}}>
                <strong style={{display: 'block', marginBottom: '10px'}}>📅 Schedule Future Blast:</strong>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const time = e.target.elements.triggerTime.value;
                    const msg = e.target.elements.message.value;
                    const freq = e.target.elements.frequency.value;
                    try {
                        await axios.post(`${API_URL}/blasts`, { trigger_time: time, message: msg, frequency: freq });
                        alert('Blast successfully scheduled for ' + new Date(time).toLocaleString() + '!');
                        fetchBlasts();
                        e.target.reset();
                    } catch(err) { alert('Error scheduling blast'); }
                }} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <input type="datetime-local" name="triggerTime" required style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
                    <select name="frequency" style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                        <option value="once">Send Once</option>
                        <option value="daily">Continuous - Send Daily</option>
                        <option value="weekly">Continuous - Send Weekly</option>
                        <option value="monthly">Continuous - Send Monthly</option>
                    </select>
                    <textarea name="message" required rows="3" placeholder="Enter your custom message here..." style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical'}} defaultValue="Hi team, please let me know your availability for the upcoming schedule!"></textarea>
                    <button type="submit" style={{background: 'var(--primary)'}}>🕒 Schedule Blast</button>
                </form>

                {blasts.length > 0 && (
                    <div style={{marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px'}}>
                        <strong>Active Scheduled Blasts:</strong>
                        <ul style={{listStyle: 'none', padding: 0, marginTop: '10px'}}>
                            {blasts.map(b => (
                                <li key={b.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee', marginBottom: '5px'}}>
                                    <div style={{fontSize: '0.9rem'}}>
                                        <span style={{fontWeight: 'bold', color: 'var(--primary)'}}>[{b.frequency.toUpperCase()}]</span> 
                                        {' '} {new Date(b.trigger_time).toLocaleString()} - <em>"{b.message.substring(0, 30)}..."</em>
                                        <br/><span style={{fontSize: '0.8rem', color: '#888'}}>Status: {b.status}</span>
                                    </div>
                                    <button onClick={() => deleteBlast(b.id)} style={{background: 'transparent', color: 'red', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '5px'}}>✖</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="card">
            <h3>Add New Team Member</h3>
            <form className="form-group" onSubmit={addEmployee}>
              <input type="text" placeholder="Full Name" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required />
              <input type="text" placeholder="Phone Number (e.g., 1234567890)" value={newEmp.phone_number} onChange={e => setNewEmp({...newEmp, phone_number: e.target.value})} required />
              <button type="submit">Add Member</button>
            </form>

            <h3 style={{marginTop: '30px'}}>Directory ({employees.length})</h3>
            <ul className="employee-list">
              {employees.length === 0 ? <p style={{color: '#667781'}}>No team members added yet.</p> : null}
              {employees.map(emp => (
                <li key={emp.id}>
                  <div>
                    <strong>{emp.name}</strong><br/>
                    <span style={{color: '#667781', fontSize: '0.9rem'}}>{emp.phone_number}</span>
                  </div>
                  <button className="btn-danger" onClick={() => deleteEmployee(emp.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div className="card">
            <h3>Incoming Availability Replies</h3>
            <p style={{color: '#667781', marginBottom: '20px'}}>When team members reply to the automated blast, their messages will appear here.</p>
            <ul className="response-list">
                {responses.length === 0 ? <p>No recent replies.</p> : null}
                {responses.map(resp => {
                    const emp = employees.find(e => {
                        const cleanDbPhone = e.phone_number.replace(/[^0-9]/g, '');
                        return resp.phone_number.includes(cleanDbPhone);
                    });
                    const displayName = emp ? emp.name : resp.phone_number;

                    return (
                    <li key={resp.id}>
                        <div>
                            <strong>{displayName}</strong>
                            <span className="response-time"> • {new Date(resp.timestamp).toLocaleString()}</span>
                        </div>
                        <div style={{marginTop: '5px', padding: '10px', backgroundColor: '#f0f2f5', borderRadius: '8px', width: '100%'}}>
                            {resp.message}
                        </div>
                    </li>
                    )
                })}
            </ul>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="card" style={{overflowX: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <div>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{marginBottom: 0}} />
                </div>
                <button onClick={autoGenerateSchedule} disabled={isGenerating} style={{background: '#6366f1'}}>
                    {isGenerating ? '✨ Generating...' : '✨ Auto-Generate with AI'}
                </button>
            </div>
            
            <p style={{color: '#667781', marginBottom: '20px'}}>
                This grid matches your paper format. Look at the Inbox replies and fill in the start/end times here.
            </p>

            <table className="schedule-table">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Phone</th>
                        <th>Mon</th>
                        <th>Tue</th>
                        <th>Wed</th>
                        <th>Thu</th>
                        <th>Fri</th>
                        <th>Sat</th>
                        <th>Sun</th>
                        <th>Total Hours</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map(emp => {
                        const sched = aiSchedule[emp.id] || { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total_hours: 0 };
                        return (
                        <tr key={emp.id}>
                            <td><strong>{emp.name}</strong></td>
                            <td style={{fontSize: '0.85rem', color: '#667'}}>{emp.phone_number}</td>
                            <td><input type="text" defaultValue={sched.mon} placeholder="-" className="shift-input" /></td>
                            <td><input type="text" defaultValue={sched.tue} placeholder="-" className="shift-input" /></td>
                            <td><input type="text" defaultValue={sched.wed} placeholder="-" className="shift-input" /></td>
                            <td><input type="text" defaultValue={sched.thu} placeholder="-" className="shift-input" /></td>
                            <td><input type="text" defaultValue={sched.fri} placeholder="-" className="shift-input" /></td>
                            <td><input type="text" defaultValue={sched.sat} placeholder="-" className="shift-input" /></td>
                            <td><input type="text" defaultValue={sched.sun} placeholder="-" className="shift-input" /></td>
                            <td style={{fontWeight: 'bold', textAlign: 'center'}}>{sched.total_hours}</td>
                        </tr>
                        );
                    })}
                    {employees.length === 0 && (
                        <tr><td colSpan="10" style={{textAlign: 'center', padding: '20px'}}>Add employees to see the schedule grid.</td></tr>
                    )}
                </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
