const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const dotenv = require('dotenv');
dotenv.config();

// Tencent API Setup
const TsiClient = tencentcloud.tsi.v20190823.Client;
const clientConfig = {
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: 'ap-beijing', // Make sure to choose the right region
  profile: {
    httpProfile: {
      endpoint: 'tsi.tencentcloudapi.com',
    },
  },
};

// Converts mp4 file to wav format
function convertToWav(inputFilePath, outputFilePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .output(outputFilePath)
      .audioCodec('pcm_s16le') // Convert to 16-bit PCM WAV format
      .on('end', () => resolve(outputFilePath))
      .on('error', (err) => reject(err))
      .run();
  });
}

// Call Tencent TSI API for translation
async function translateAudioToChinese(wavFilePath) {
  const client = new TsiClient(clientConfig);
  const params = {
    EngineModelType: '16k_zh',  // Assuming you're translating from English to Chinese
    VoiceType: 0, // 0 = Female, 1 = Male
    ProjectId: 0, // Optional
    FileContent: fs.readFileSync(wavFilePath).toString('base64'),
  };

  const req = {
    AudioData: params.FileContent,
    EngineModelType: params.EngineModelType,
    VoiceType: params.VoiceType,
    ProjectId: params.ProjectId,
  };

  try {
    const data = await client.Translator(req);
    return data;
  } catch (error) {
    console.error('Error in TSI Translation:', error);
    throw error;
  }
}

module.exports = { convertToWav, translateAudioToChinese };
