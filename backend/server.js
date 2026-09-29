const express = require('express');
const cors = require('cors');
const db = require('./database');
const whatsapp = require('./whatsapp');
require('./scheduler');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// --- WhatsApp API ---
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: whatsapp.isConnected(),
        qrCode: whatsapp.getQrCode()
    });
});

app.post('/api/whatsapp/test', async (req, res) => {
    const { phone, message } = req.body;
    try {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = '1' + cleanPhone;
        await whatsapp.sendMessage(cleanPhone, message || 'Test message from Scheduler');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Employees API ---
app.get('/api/employees', (req, res) => {
    db.all('SELECT * FROM employees', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/employees', (req, res) => {
    const { name, phone_number } = req.body;
    db.run('INSERT INTO employees (name, phone_number) VALUES (?, ?)', [name, phone_number], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, name, phone_number });
    });
});

app.delete('/api/employees/:id', (req, res) => {
    db.run('DELETE FROM employees WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- Schedules API ---
app.get('/api/schedules', (req, res) => {
    db.all('SELECT s.*, e.name FROM schedules s JOIN employees e ON s.employee_id = e.id', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/schedules', (req, res) => {
    const { employee_id, date, start_time, end_time } = req.body;
    db.run('INSERT INTO schedules (employee_id, date, start_time, end_time) VALUES (?, ?, ?, ?)', 
        [employee_id, date, start_time, end_time], 
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, employee_id, date, start_time, end_time });
        });
});

app.get('/api/responses', (req, res) => {
    db.all('SELECT * FROM availability_responses ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

const { GoogleGenerativeAI } = require('@google/generative-ai');
const ai = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY_HERE');

app.post('/api/generate-schedule', async (req, res) => {
    const { employees, responses } = req.body;
    
    const prompt = `
    You are a scheduling assistant. 
    Here is a list of employees: ${JSON.stringify(employees.map(e => ({id: e.id, name: e.name, phone: e.phone_number})))}
    Here are their recent text messages about their availability: ${JSON.stringify(responses.map(r => ({phone: r.phone_number, msg: r.message})))}
    
    Figure out each employee's shifts for the week based on their messages.
    Return ONLY a JSON array of objects with the exact keys:
    [
      {
        "employee_id": 1,
        "mon": "9-5", "tue": "9-5", "wed": "-", "thu": "10-6", "fri": "10-6", "sat": "-", "sun": "-",
        "total_hours": 32
      }
    ]
    Make sure to match their phone numbers to get the correct employee_id. If a day isn't mentioned, assume "-" (off). Calculate rough total hours. Return raw JSON array only, no markdown blocks.
    `;

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-3.7-flash' });
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        // Remove markdown formatting if present
        if (text.startsWith('\`\`\`json')) text = text.replace(/\`\`\`json/g, '');
        if (text.startsWith('\`\`\`')) text = text.replace(/\`\`\`/g, '');
        
        const scheduleData = JSON.parse(text);
        res.json(scheduleData);
    } catch (e) {
        console.error('AI Error:', e);
        res.status(500).json({ error: 'Failed to generate schedule: ' + e.message });
    }
});

app.get('/api/blasts', (req, res) => {
    db.all('SELECT * FROM scheduled_blasts ORDER BY trigger_time ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/blasts', (req, res) => {
    const { trigger_time, message, frequency } = req.body;
    db.run('INSERT INTO scheduled_blasts (trigger_time, message, status, frequency) VALUES (?, ?, ?, ?)', [trigger_time, message, 'pending', frequency || 'once'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: 'scheduled' });
    });
});

app.delete('/api/blasts/:id', (req, res) => {
    db.run('DELETE FROM scheduled_blasts WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(port, () => {
    console.log('Backend running on port ' + port);
});


