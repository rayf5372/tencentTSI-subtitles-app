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

/** 1) Convert input MP4 → raw 16 kHz 16‑bit mono PCM */
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

/**
 * 2) Read the PCM file, slice it into <=500ms chunks,
 *    and call TongChuanSync once per chunk in-order.
 */
async function translateAudioToChinese(pcmPath) {
  const client   = new TsiClient(clientConfig);
  const pcmBuf   = fs.readFileSync(pcmPath);
  const session  = uuidv4();
  const sr       = 16000;     // samples/sec
  const bps      = 2;         // bytes/sample
  const maxMs    = 500;       // ≤500 ms per chunk
  const chunkSz  = sr * bps * maxMs / 1000; // bytes per chunk
  const results  = [];
  let seq        = 0;

  for (let offset = 0; offset < pcmBuf.length; offset += chunkSz) {
    const slice     = pcmBuf.slice(offset, offset + chunkSz);
    const isEnd     = offset + chunkSz >= pcmBuf.length ? 1 : 0;
    const utcOffset = Math.floor(offset / (sr * bps) * 1000);

    const params = {
      SessionUuid:  session,
      Source:       'en',
      Target:       'zh',
      AudioFormat:  1,        // PCM
      Seq:          seq++,
      Utc:          utcOffset,
      IsEnd:        isEnd,
      TranslateTime:2,        // sentence‑level real‑time
      Data:         slice.toString('base64'),
    };

    const { List } = await client.TongChuanSync(params);
    results.push(...List);
  }

  return results;
}

module.exports = { convertToPcm, translateAudioToChinese };
