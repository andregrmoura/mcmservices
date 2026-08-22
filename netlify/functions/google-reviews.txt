const https = require('https');

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const message =
              parsed.error?.message ||
              parsed.error_description ||
              `HTTP ${res.statusCode}`;

            return reject(new Error(message));
          }

          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function findPlaceId(apiKey) {
  const body = JSON.stringify({
    textQuery: 'Moura Consulting & Management Florida',
    includePureServiceAreaBusinesses: true
  });

  const data = await requestJson(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.googleMapsUri,places.websiteUri'
      }
    },
    body
  );

  const places = data.places || [];

  if (!places.length) {
    throw new Error('Moura Consulting & Management was not found in Places search.');
  }

  const exactMatch = places.find((place) => {
    const name = (place.displayName?.text || '').trim().toLowerCase();
    return name === 'moura consulting & management';
  });

  const websiteMatch = places.find((place) => {
    const website = (place.websiteUri || '').toLowerCase();
    return website.includes('moura-consulting.com');
  });

  const selected = exactMatch || websiteMatch || places[0];

  if (!selected?.id) {
    throw new Error('Places search returned a result without a Place ID.');
  }

  return selected.id;
}

exports.handler = async function () {
  try {
    const { GOOGLE_PLACES_API_KEY } = process.env;

    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Missing environment variable: GOOGLE_PLACES_API_KEY');
    }

    const placeId = await findPlaceId(GOOGLE_PLACES_API_KEY);

    const url =
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

    const data = await requestJson(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'rating',
          'userRatingCount',
          'googleMapsUri',
          'websiteUri',
          'reviews'
        ].join(',')
      }
    });

    const reviews = (data.reviews || [])
      .slice()
      .sort((a, b) => {
        const aTime = a.publishTime ? new Date(a.publishTime).getTime() : 0;
        const bTime = b.publishTime ? new Date(b.publishTime).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 3)
      .map((review) => ({
        author: review.authorAttribution?.displayName || 'Google user',
        rating: Number(review.rating) || 5,
        comment:
          review.text?.text ||
          review.originalText?.text ||
          '',
        date:
          review.relativePublishTimeDescription ||
          (review.publishTime
            ? new Date(review.publishTime).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : ''),
        publishTime: review.publishTime || '',
        sourceUrl: review.googleMapsUri || data.googleMapsUri || '',
        authorUrl: review.authorAttribution?.uri || '',
        authorPhoto: review.authorAttribution?.photoUri || ''
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=3600'
      },
      body: JSON.stringify({
        placeId: data.id || placeId,
        business: {
          name: data.displayName?.text || '',
          rating: Number(data.rating) || null,
          reviewCount: Number(data.userRatingCount) || 0,
          googleMapsUrl: data.googleMapsUri || '',
          website: data.websiteUri || ''
        },
        reviews
      })
    };
  } catch (error) {
    console.error('google-reviews:', error.message);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        error: 'Google reviews unavailable',
        detail: error.message
      })
    };
  }
};
