const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./database');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let qrCodeData = null;
let isConnected = false;

client.on('qr', (qr) => {
    qrCodeData = qr;
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
    qrCodeData = null;
    isConnected = true;
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    isConnected = false;
});

client.on('message', async msg => {
    // Log incoming messages to database just in case
    db.run('INSERT INTO availability_responses (phone_number, message) VALUES (?, ?)', 
        [msg.from, msg.body], 
        function(err) {
            if (err) {
                console.error('Error saving response', err);
            }
        });
});

client.initialize();

module.exports = {
    client,
    getQrCode: () => qrCodeData,
    isConnected: () => isConnected,
    sendMessage: async (to, message) => {
        if (!isConnected) throw new Error('WhatsApp not connected');
        // 'to' should be in format '1234567890@c.us'
        const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
        return await client.sendMessage(chatId, message);
    }
};
