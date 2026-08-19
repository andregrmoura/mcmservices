const https = require('https');

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(parsed.error_description || parsed.error?.message || `HTTP ${res.statusCode}`));
          }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async function () {
  try {
    const {
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      GOOGLE_BUSINESS_ACCOUNT_ID,
      GOOGLE_BUSINESS_LOCATION_ID
    } = process.env;

    const missing = Object.entries({
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      GOOGLE_BUSINESS_ACCOUNT_ID,
      GOOGLE_BUSINESS_LOCATION_ID
    }).filter(([, value]) => !value).map(([key]) => key);

    if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

    const tokenBody = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    }).toString();

    const token = await requestJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenBody)
      }
    }, tokenBody);

    const parent = `accounts/${GOOGLE_BUSINESS_ACCOUNT_ID}/locations/${GOOGLE_BUSINESS_LOCATION_ID}`;
    const url = `https://mybusiness.googleapis.com/v4/${parent}/reviews?pageSize=3&orderBy=${encodeURIComponent('updateTime desc')}`;
    const data = await requestJson(url, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    const reviews = (data.reviews || []).slice(0, 3).map(review => ({
      author: review.reviewer?.displayName || 'Google user',
      rating: ({ ONE:1, TWO:2, THREE:3, FOUR:4, FIVE:5 })[review.starRating] || 5,
      comment: review.comment || '',
      date: review.createTime ? new Date(review.createTime).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : ''
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=3600'
      },
      body: JSON.stringify({ reviews })
    };
  } catch (error) {
    console.error('google-reviews:', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Google reviews unavailable' })
    };
  }
};
