export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const name = (body.name || '').trim();
    const gender = body.gender || 'Not specified';
    const dob = body.dob || '';
    const tob = body.tob || '';
    const pob = body.pob || '';
    const question = body.question || 'Please provide an overview of my current planetary phase and guidance.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;

    if (!dob || !tob || !pob) {
      return new Response(
        JSON.stringify({ answer: "Please provide complete birth details (Date, Time, and Place of Birth)." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const groqKey = env.GROQ_API_KEY;
    const vedicKey = env.VEDIC_ASTRO_KEY;

    if (!groqKey || !vedicKey) {
      return new Response(
        JSON.stringify({ answer: "CONFIGURATION ERROR: Required API keys (GROQ_API_KEY or VEDIC_ASTRO_KEY) are missing in Cloudflare." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Convert YYYY-MM-DD to DD/MM/YYYY
    let day = '', month = '', year = '';
    if (dob.includes('-')) {
      const parts = dob.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      return new Response(
        JSON.stringify({ answer: "Invalid date format. Please select a valid date." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const formattedDate = `${day}/${month}/${year}`;

    let formattedTime = tob;
    if (tob.includes(':')) {
      const tparts = tob.split(':');
      formattedTime = `${tparts[0].padStart(2, '0')}:${tparts[1].padStart(2, '0')}`;
    }

    // Coordinates: Default to Dombivli/Thane coordinates, geocode if different
    let lat = 19.2183;
    let lon = 73.0867;
    let tz = 5.5;

    const cleanPob = pob.toLowerCase();
    if (!cleanPob.includes('dombivli')) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pob)}&format=json&limit=1`, { headers: { 'User-Agent': 'BhuvanaAstrologyApp/1.0' } } ); const geoData = await geoRes.json(); if (geoData && geoData.length > 0) { lat = parseFloat(geoData[0].lat); lon = parseFloat(geoData[0].lon); } } catch (geoErr) { lat = 19.2183; lon = 73.0867; } }  // 1. Fetch Verified Planetary Details from Vedic Astro API const astroUrl = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`; const astroRes = await fetch(astroUrl); const astroJson = await astroRes.json();  let planetSummary = []; let lagnaInfo = "";  if (astroJson && (astroJson.response \vert{}\vert{} astroJson.status === 200)) { const raw = astroJson.response \vert{}\vert{} astroJson; if (raw && typeof raw === 'object') { for (const key of Object.keys(raw)) { const item = raw[key]; if (item && item.name) { const line = `${item.name}: in ${item.sign \vert{}\vert{} item.rashi \vert{}\vert{} 'Unknown Sign'} (${item.house || '?'} House, Nakshatra: ${item.nakshatra \vert{}\vert{} 'Unknown'})`; planetSummary.push(line); if (item.name.toLowerCase() === 'ascendant' \vert{}\vert{} item.name.toLowerCase() === 'lagna') { lagnaInfo = `Ascendant (Lagna): ${item.sign || item.rashi}`;
            }
          }
        }
      }
    }

    // 2. Fetch Active Dasha from Vedic Astro API
    let activeDashaInfo = "";
    try {
      const dashaUrl = `https://api.vedicastroapi.com/v3-json/dashas/current-mahadasha?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
      const dashaRes = await fetch(dashaUrl);
      const dashaJson = await dashaRes.json();
      if (dashaJson && (dashaJson.response || dashaJson.status === 200)) {
        const dData = dashaJson.response || dashaJson;
        if (dData.mahadasha || dData.major) {
          activeDashaInfo = `Active Mahadasha: ${dData.mahadasha || dData.
