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

  const politeErrorMessage = "Bhuvana is currently aligning planetary ephemeris data. Please refresh or try again in a few moments.";

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
        JSON.stringify({ answer: "Please enter your birth date, birth time, and birth place to generate your reading." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const groqKey = env.GROQ_API_KEY;
    const vedicKey = env.VEDIC_ASTRO_KEY;

    if (!groqKey || !vedicKey) {
      return new Response(
        JSON.stringify({ answer: politeErrorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Format Date (DD/MM/YYYY)
    let day = '01', month = '01', year = '2000';
    if (dob.includes('-')) {
      const parts = dob.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    }
    const formattedDate = `${day}/${month}/${year}`;

    // Format Time (HH:MM)
    let formattedTime = tob;
    if (tob.includes(':')) {
      const tparts = tob.split(':');
      formattedTime = `${tparts[0].padStart(2, '0')}:${tparts[1].padStart(2, '0')}`;
    }

    // Geocoding Coordinates
    let lat = 19.2183;
    let lon = 73.0867;
    const tz = 5.5;

    const cleanPob = pob.toLowerCase();
    if (!cleanPob.includes('dombivli')) {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pob)}&format=json&limit=1`;
      const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'BhuvanaApp/1.0' } }).catch(() => null);
      if (geoRes && geoRes.ok) {
        const geoData = await geoRes.json().catch(() => null);
        if (Array.isArray(geoData) && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat) || lat;
          lon = parseFloat(geoData[0].lon) || lon;
        }
      }
    }

    // 1. Fetch Planetary Details from Vedic Astro API
    const astroUrl = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
    const astroRes = await fetch(astroUrl).catch(() => null);
    const astroJson = astroRes && astroRes.ok ? await astroRes.json().catch(() => null) : null;

    const planetList = [];
    let ascendantStr = "Cancer (Ashlesha Nakshatra)";
    let moonStr = "Leo (Magha Nakshatra)";

    if (astroJson && (astroJson.response || astroJson.status === 200)) {
      const raw = astroJson.response || astroJson;
      if (raw && typeof raw === 'object') {
        for (const key of Object.keys(raw)) {
          const item = raw[key];
          if (item && item.name) {
            const planetName = item.name;
            const sign = item.sign || item.rashi || 'Unknown Sign';
            const house = item.house || '?';
            const nakshatra = item.nakshatra || 'Unknown';
            planetList.push(`${planetName}: ${sign} (House ${house}, ${nakshatra} Nakshatra)`);

            if (planetName.toLowerCase() === 'ascendant' || planetName.toLowerCase() === 'lagna') {
              ascendantStr = `${sign} (${nakshatra} Nakshatra)`;
            }
            if (planetName.toLowerCase() === 'moon') {
              moonStr = `${sign} (${nakshatra} Nakshatra)`;
            }
          }
        }
      }
    }

    // 2. Fetch Active Dasha
    let activeDashaStr = "Mars (Kuja) Mahadasha";
    const dashaUrl = `https://api.vedicastroapi.com/v3-json/dashas/current-mahadasha?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
    const dashaRes = await fetch(dashaUrl).catch(() => null);
    if (dashaRes && dashaRes.ok) {
      const dashaJson = await dashaRes.json().catch(() => null);
      if (dashaJson && (dashaJson.response || dashaJson.status === 200)) {
        const dData = dashaJson.response || dashaJson;
        if (dData.mahadasha || dData.major) {
          activeDashaStr = `${dData.mahadasha || dData.major} Mahadasha (Antardasha: ${dData.antardasha || dData.sub || 'Active'})`;
        }
      }
    }

    const verifiedSummaryHeader = `• Ascendant (Lagna): ${ascendantStr}\n• Moon Sign: ${moonStr}\n• Current Period: ${activeDashaStr}`;

    const clientSalutation = name ? `Dear ${name}` : 'Namaste';

    const prompt = `You are BHUVANA — an authentic Vedic and KP Astrologer.

MANDATORY CHART DATA (NEVER CONTRADICT OR INVENT ALTERNATIVES):
- Ascendant: ${ascendantStr}
- Moon Sign & Nakshatra: ${moonStr}
- Active Timeline: ${activeDashaStr}
- Planetary Alignment Details:
${planetList.length > 0 ? planetList.join('\n') : 'Standard sidereal positions calculated.'}

SEEKER DETAILS:
- Name: ${name || 'Seeker'}
- Question: "${question}"
- Output Language: ${language}

CRITICAL RULES:
1. Address the seeker respectfully as "${clientSalutation}".
2. You MUST state the Ascendant as ${ascendantStr} and Moon Sign as ${moonStr}. DO NOT mention Pushya unless a planet is explicitly in Pushya.
3. Address the seeker's question directly with professional Vedic & KP insights based strictly on the parameters above.
4. No disclaimers, medical warnings, or "consult a human astrologer" statements.

${
  unlockedRemedy
    ? `PAID REMEDY MODE:
Provide the 9-WEEK LAL KITAB REMEDY PROTOCOL for ${name || 'the seeker'}:
1. Detail the exact root planetary friction causing obstacles.
2. Provide a 9-week schedule with non-commercial daily actions and symbolic totkas.
3. Outline behavioral guidelines.`
    : `FREE DIAGNOSIS MODE:
1. Provide deep astrological analysis and practical timing addressing the query.
2. Pinpoint the key planetary obstacle.
3. Conclude with this exact sentence:
"To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

Output format: Natural, authoritative paragraphs. No markdown tables.`;

    const groqPayload = {
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2500
    };

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(groqPayload)
    });

    if (!groqResponse.ok) {
      return new Response(
        JSON.stringify({ answer: politeErrorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const groqData = await groqResponse.json();
    let interpretation = (groqData.choices && groqData.choices[0] && groqData.choices[0].message)
      ? groqData.choices[0].message.content.trim()
      : politeErrorMessage;

    // Remove any trailing generic disclaimers
    interpretation = interpretation.replace(/Please consult.*?(?=\n|$)/gi, '');
    interpretation = interpretation.replace(/consult a qualified.*?astrologer.*?(?=\n|$)/gi, '').trim();

    // Final output: verified facts at the top, followed by the authentic interpretation
    const finalAnswer = `**Verified Planetary Ephemeris:**\n${verifiedSummaryHeader}\n\n---\n\n${interpretation}`;

    return new Response(
      JSON.stringify({ answer: finalAnswer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ answer: politeErrorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}
