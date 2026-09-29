const cron = require('node-cron');
const db = require('./database');
const whatsapp = require('./whatsapp');

// Check every minute for custom scheduled blasts
cron.schedule('* * * * *', () => {
    db.all("SELECT * FROM scheduled_blasts WHERE status = 'pending' AND datetime(trigger_time) <= datetime('now', 'localtime')", [], (err, rows) => {
        if (err) return console.error('Scheduler DB Error:', err);
        
        rows.forEach(blast => {
            console.log('Executing custom blast:', blast.id);
            db.all("SELECT phone_number FROM employees", [], (err, employees) => {
                if (err) return;
                employees.forEach(emp => {
                    whatsapp.sendMessageToNumber(emp.phone_number, blast.message);
                });
            });
            
            if (blast.frequency === 'daily') {
                db.run("UPDATE scheduled_blasts SET trigger_time = datetime(trigger_time, '+1 day') WHERE id = ?", [blast.id]);
            } else if (blast.frequency === 'weekly') {
                db.run("UPDATE scheduled_blasts SET trigger_time = datetime(trigger_time, '+7 days') WHERE id = ?", [blast.id]);
            } else if (blast.frequency === 'monthly') {
                db.run("UPDATE scheduled_blasts SET trigger_time = datetime(trigger_time, '+1 month') WHERE id = ?", [blast.id]);
            } else {
                db.run("UPDATE scheduled_blasts SET status = 'sent' WHERE id = ?", [blast.id]);
            }
        });
    });
});

// Original built-in schedule: 10:00 AM on the 14th and 30th
cron.schedule('0 10 14,30 * *', () => {
    console.log('Running automated message job for 14th/30th');
    
    if (!whatsapp.isConnected()) {
        console.log('WhatsApp not connected, skipping scheduled message.');
        return;
    }

    db.all('SELECT * FROM employees', [], async (err, rows) => {
        if (err) {
            console.error('Failed to get employees for schedule', err);
            return;
        }

        for (const emp of rows) {
            const message = `Hi ${emp.name}, let me know your availability for the upcoming schedule. Can you send me your hours?`;
            try {
                // Ensure phone number has country code. Assuming North America (+1) for this example if 10 digits.
                let phone = emp.phone_number.replace(/[^0-9]/g, '');
                if (phone.length === 10) {
                    phone = '1' + phone;
                }
                await whatsapp.sendMessage(phone, message);
                console.log(`Sent to ${emp.name} (${phone})`);
            } catch (e) {
                console.error(`Failed to send to ${emp.name}`, e);
            }
        }
    });
});

console.log('Scheduler initialized.');
