require('dotenv').config();
const { generateSignature } = require('./utils');
const WebSocket = require('ws'); 
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');  

const secretID = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;
const appID = process.env.TENCENT_APP_ID;
const regionURL = 'wss://tsi.ap-shanghai.tencentcloudapi.com'; 
const timestamp = Math.floor(Date.now() / 1000);
const expired = timestamp + 86400; // 24 hours

const signature = generateSignature(secretID, secretKey, timestamp, expired);

const wsUrl = `${regionURL}/?appid=${appID}&secretid=${secretID}&timestamp=${timestamp}&expired=${expired}&signature=${signature}`;

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('Connected to Tencent TSI API via WebSocket');
});

ws.on('message', (data) => {
    console.log('Received message from API:', data);
});

ws.on('close', () => {
    console.log('WebSocket connection closed');
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
    const audioFilePath = req.file.path;
    console.log('Received file:', audioFilePath);

    const outputFilePath = path.join(__dirname, 'uploads', `${req.file.filename}.wav`);
    ffmpeg(audioFilePath)
        .toFormat('wav')
        .on('end', () => {
            console.log('File converted to WAV:', outputFilePath);
            sendAudioToTencent(outputFilePath, res);
        })
        .on('error', (err) => {
            console.error('Error during conversion:', err);
            res.status(500).send('Error converting file');
        })
        .save(outputFilePath);
});

const sendAudioToTencent = (filePath, res) => {
    const fileStream = fs.createReadStream(filePath);

    const form = new FormData();
    form.append('file', fileStream);
    form.append('language', 'zh'); // Adjust if needed

    axios.post('https://api.tencentcloud.com/v1/translate', form, {
        headers: {
            ...form.getHeaders(), 
        },
    })
    .then(response => {
        res.json(response.data);  
    })
    .catch(error => {
        console.error(error);
        res.status(500).send('Translation failed');
    });
};

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
