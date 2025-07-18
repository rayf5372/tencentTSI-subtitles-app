require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const {
  convertToPcm,
  translateBatch,
  streamTranslate
} = require('./util');

const app    = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请用 key="video" 上传 MP4' });
  const orig = req.file.path;
  const pcm  = path.join('uploads', `${req.file.filename}.pcm`);
  try {
    await convertToPcm(orig, pcm);
    const translation = await translateBatch(pcm);
    fs.unlinkSync(orig);
    fs.unlinkSync(pcm);
    fs.writeFileSync('latest_output.json', JSON.stringify(translation, null, 2));
    res.json({ translation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/stream', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请用 key="video" 上传 MP4' });
  const orig     = req.file.path;
  const pcm      = path.join('uploads', `${req.file.filename}.pcm`);
  const segments = [];
  try {
    await convertToPcm(orig, pcm);
    await streamTranslate(pcm, seg => {
      console.log(
        `[${seg.StartTime}-${seg.EndTime}]`,
        `${seg.SourceText} → ${seg.TargetText}`
      );
      segments.push(seg);
    });
    fs.unlinkSync(orig);
    fs.unlinkSync(pcm);
    fs.writeFileSync('stream_output.json', JSON.stringify(segments, null, 2));
    res.json({ segments });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));