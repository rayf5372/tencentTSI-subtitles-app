// index.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { convertToWav, translateAudioToChinese } = require('./util');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Setup for file upload
const upload = multer({
  dest: 'uploads/', // temporary location for uploaded files
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for the upload
}).single('audio'); // Expecting the file to be sent as 'audio'

// Route to handle file upload and processing
app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send({ error: 'File upload failed', details: err });
    }

    const uploadedFilePath = req.file.path;
    const wavFilePath = path.join('uploads', `${req.file.filename}.wav`);

    try {
      // Step 1: Convert MP4 to WAV
      await convertToWav(uploadedFilePath, wavFilePath);

      // Step 2: Translate the audio to Chinese using Tencent TSI API
      const translationResult = await translateAudioToChinese(wavFilePath);

      // Clean up: Remove the temporary files
      fs.unlinkSync(uploadedFilePath);
      fs.unlinkSync(wavFilePath);

      // Respond with the translated result
      res.status(200).json({
        originalAudio: uploadedFilePath,
        translation: translationResult,
      });
    } catch (error) {
      console.error('Error processing the file:', error);
      res.status(500).send({ error: 'An error occurred while processing the audio.' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
