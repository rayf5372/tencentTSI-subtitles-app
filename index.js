require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { convertToPcm, translateAudioToChinese } = require('./util');

const app    = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请用 key="video" 上传一个 MP4 文件' });
  }

  const orig = req.file.path;
  const pcm  = path.join('uploads', `${req.file.filename}.pcm`);

  try {
    await convertToPcm(orig, pcm);
    const translation = await translateAudioToChinese(pcm);

    // cleanup 
    fs.unlinkSync(orig);
    fs.unlinkSync(pcm);

    fs.writeFileSync(
      path.join(__dirname, 'latest_output.json'),
      JSON.stringify(translation, null, 2),
      'utf-8'
    );

    res.json({ translation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Listening on http://localhost:${process.env.PORT || 3000}`)
);
