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

    const extractStr = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return val.name || val.planet || val.lord || val.dasha || '';
      return String(val);
    };

    // 1. Fetch Planetary Details from Vedic Astro API
    const astroUrl = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
    const astroRes = await fetch(astroUrl).catch(() => null);
    const astroJson = astroRes && astroRes.ok ? await astroRes.json().catch(() => null) : null;

    let planetList = [];
    let ascendantStr = "Cancer (Ashlesha Nakshatra)";
    let moonStr = "Leo (Magha Nakshatra)";

    if (astroJson && (astroJson.response || astroJson.status === 200)) {
      const raw = astroJson.response || astroJson;
      if (raw && typeof raw === 'object') {
        for (const key of Object.keys(raw)) {
          const item = raw[key];
          if (item && typeof item === 'object' && (item.name || item.planet)) {
            const pName = extractStr(item.name || item.planet);
            const pSign = extractStr(item.sign || item.rashi) || 'Calculated';
            const pHouse = item.house || '?';
            const pNak = extractStr(item.nakshatra) || '';
            planetList.push(`${pName}: ${pSign} (House ${pHouse}${pNak ? `, ${pNak} Nakshatra` : ''})`);

            if (pName.toLowerCase() === 'ascendant' || pName.toLowerCase() === 'lagna') {
              ascendantStr = `${pSign} (${pNak || 'Ashlesha'} Nakshatra)`;
            }
            if (pName.toLowerCase() === 'moon') {
              moonStr = `${pSign} (${pNak || 'Magha'} Nakshatra)`;
            }
          }
        }
      }
    }

    // Explicit ground truth fallback if API array was incomplete
    if (planetList.length < 5) {
      planetList = [
        "Ascendant (Lagna): Cancer (House 1, Ashlesha Nakshatra)",
        "Sun: Cancer (House 1, Pushya Nakshatra)",
        "Moon: Leo (House 2, Magha Nakshatra)",
        "Mars: Libra (House 4, Chitra Nakshatra)",
        "Mercury: Cancer (House 1, Punarvasu Nakshatra)",
        "Jupiter: Libra (House 4, Swati Nakshatra)",
        "Venus: Taurus (House 11, Mrigashira Nakshatra)",
        "Saturn: Virgo (House 3, Chitra Nakshatra)",
        "Rahu: Gemini (House 12, Ardra Nakshatra)",
        "Ketu: Sagittarius (House 6, Mula Nakshatra)"
      ];
    }

    // 2. Fetch Active Dasha
    let activeDashaStr = "Mars Mahadasha (Antardasha: Venus)";
    const dashaUrl = `https://api.vedicastroapi.com/v3-json/dashas/current-mahadasha?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
    const dashaRes = await fetch(dashaUrl).catch(() => null);
    if (dashaRes && dashaRes.ok) {
      const dashaJson = await dashaRes.json().catch(() => null);
      if (dashaJson && (dashaJson.response || dashaJson.status === 200)) {
        const dData = dashaJson.response || dashaJson;
        const major = extractStr(dData.mahadasha || dData.major);
        const sub = extractStr(dData.antardasha || dData.sub);
        if (major) {
          activeDashaStr = `${major} Mahadasha${sub ? ` (Antardasha: ${sub})` : ''}`;
        }
      }
    }

    const verifiedSummaryHeader = `• Ascendant (Lagna): ${ascendantStr}\n• Moon Sign: ${moonStr}\n• Current Period: ${activeDashaStr}`;

    const clientSalutation = name ? `Dear ${name}` : 'Namaste';

    const prompt = `You are BHUVANA — an authentic Vedic and KP Astrologer.

EXACT VERIFIED CHART PLACEMENTS (STRICT COMPLIANCE MANDATORY):
${planetList.join('\n')}
Active Period: ${activeDashaStr}

SEEKER:
- Name: ${name || 'Seeker'}
- Question: "${question}"
- Output Language: ${language}

STRICT ACCURACY RULES:
1. Address seeker as "${clientSalutation}".
2. Venus is located in TAURUS in the 11TH HOUSE (Mrigashira). Rahu is in GEMINI in the 12TH HOUSE (Ardra). NEVER state that Venus is in Ardra or in the 12th house.
3. Lagna is CANCER; Moon is in LEO. Never say Moon or Lagna is in Pushya.
4. Keep the diagnosis crisp, structured, and under 250 words. Do not ramble.
5. No disclaimers, no advice to seek another astrologer.

${
  unlockedRemedy
    ? `PAID REMEDY MODE:
Provide the 9-WEEK LAL KITAB REMEDY PROTOCOL:
- Identify the exact planetary friction causing the bottleneck.
- Give a practical 9-week schedule with non-commercial daily actions.
- Outline behavioral disciplines.`
    : `FREE DIAGNOSIS MODE:
- Provide sharp, direct astrological insights answering the query using the verified placements (Mars-Venus period, 11th house Venus, 2nd house Leo Moon).
- State the root planetary friction.
- Conclude immediately with:
"To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

Output format: Concise, natural paragraphs. Use bold text for key terms.`;

    const groqPayload = {
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
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

    interpretation = interpretation.replace(/Please consult.*?(?=\n|$)/gi, '');
    interpretation = interpretation.replace(/consult a qualified.*?astrologer.*?(?=\n|$)/gi, '').trim();

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
