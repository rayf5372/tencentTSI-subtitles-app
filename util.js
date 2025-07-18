require('dotenv').config();
const fs       = require('fs');
const ffmpeg   = require('fluent-ffmpeg');
const tencent  = require('tencentcloud-sdk-nodejs');
const { v4: uuidv4 } = require('uuid');

const TsiClient = tencent.tsi.v20210325.Client;
const clientConfig = {
  credential: {
    secretId:  process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  profile: {
    httpProfile: {
      endpoint: 'tsi.tencentcloudapi.com',
      protocol: 'https:',
      timeout: 60000,
    },
  },
};

/** 1) MP4 → raw 16 kHz 16‑bit mono PCM */
function convertToPcm(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .format('s16le')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

/** 2) Batch translation */
async function translateBatch(pcmPath) {
  const client = new TsiClient(clientConfig);
  const buf    = fs.readFileSync(pcmPath);
  const session= uuidv4();
  const sr=16000, bps=2, maxMs=500;
  const chunkBytes = sr * bps * maxMs / 1000;
  let seq = 0;
  const out = [];

  for (let off=0; off<buf.length; off+=chunkBytes) {
    const slice = buf.slice(off, off+chunkBytes);
    const isEnd = off+chunkBytes >= buf.length ? 1 : 0;
    const utc   = Math.floor(off/(sr*bps)*1000);

    const { List } = await client.TongChuanSync({
      SessionUuid:   session,
      Source:        'en',
      Target:        'zh',
      AudioFormat:   1,
      Seq:            seq++,
      Utc:            utc,
      IsEnd:          isEnd,
      TranslateTime:  2,
      Data:           slice.toString('base64'),
    });
    out.push(...List);
  }
  return out;
}

/** 3) Streaming translation */
async function streamTranslate(pcmPath, onSegment) {
  const client      = new TsiClient(clientConfig);
  const buf         = fs.readFileSync(pcmPath);
  const session     = uuidv4();
  const sr=16000, bps=2, chunkMs=200;
  const chunkBytes  = sr * bps * chunkMs / 1000;
  let seq           = 0;
  let doneUploading = false;
  const seen        = new Set();

  const pushLoop = async () => {
    for (let off=0; off<buf.length; off+=chunkBytes) {
      const slice = buf.slice(off, off+chunkBytes);
      const isEnd = off+chunkBytes >= buf.length ? 1 : 0;
      const utc   = Math.floor(off/(sr*bps)*1000);

      await client.TongChuanRecognize({
        SessionUuid:   session,
        Source:        'en',
        Target:        'zh',
        AudioFormat:   1,
        Seq:            seq++,
        Utc:            utc,
        IsEnd:          isEnd,
        TranslateTime:  2,
        Data:           slice.toString('base64'),
      });
      await new Promise(r => setTimeout(r, chunkMs));
    }
    doneUploading = true;
  };

  const pullLoop = async () => {
    while (!doneUploading) {
      const raw = await client.TongChuanDisplay({
        SessionUuid: session,
        IsNew:       1,
        SeMax:       5,
      });

      console.log('Display response:', JSON.stringify(raw, null, 2));

      const list = raw.Response?.List || [];
      for (const seg of list) {
        const key = `${seg.SeId}-${seg.SeVer}`;
        if (!seen.has(key)) {
          seen.add(key);
          onSegment(seg);
        }
      }
      await new Promise(r => setTimeout(r, chunkMs));
    }
    const raw = await client.TongChuanDisplay({
      SessionUuid: session,
      IsNew:       1,
      SeMax:       5,
    });
    const list = raw.Response?.List || [];
    list.forEach(seg => {
      const key = `${seg.SeId}-${seg.SeVer}`;
      if (!seen.has(key)) onSegment(seg);
    });
  };

  await Promise.all([ pushLoop(), pullLoop() ]);
}

module.exports = { convertToPcm, translateBatch, streamTranslate };
