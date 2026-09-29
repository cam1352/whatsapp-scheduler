const { GoogleGenerativeAI } = require('@google/generative-ai');
const ai = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY_HERE');
const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
model.generateContent('test').then(res => console.log('SUCCESS', res.response.text())).catch(err => console.error('ERROR', err.message));


