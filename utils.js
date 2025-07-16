const crypto = require('crypto');

function generateSignature(secretID, secretKey, timestamp, expired) {
    const stringToSign = `a=${secretID}&b=${timestamp}&c=${expired}`;
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(stringToSign);
    const signature = hmac.digest('hex');
    return signature;
}

module.exports = { generateSignature };
