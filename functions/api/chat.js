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
    let day = '01', month = '01', year = '2000';
    if (dob.includes('-')) {
      const parts = dob.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    }
    const formattedDate = `${day}/${month}/${year}`;

    let formattedTime = tob;
    if (tob.includes(':')) {
      const tparts = tob.split(':');
      formattedTime = `${tparts[0].padStart(2, '0')}:${tparts[1].padStart(2, '0')}`;
    }

    // Default coordinates (Dombivli / Mumbai region)
    let lat = 19.2183;
    let lon = 73.0867;
    const tz = 5.5;

    // Direct geocode without messy nested try/catch
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

    // 1. Fetch Verified Planetary Details from Vedic Astro API
    const astroUrl = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
    const astroRes = await fetch(astroUrl).catch(() => null);
    const astroJson = astroRes ? await astroRes.json().catch(() => null) : null;

    const planetSummary = [];
    let lagnaInfo = "";

    if (astroJson && (astroJson.response || astroJson.status === 200)) {
      const raw = astroJson.response || astroJson;
      if (raw && typeof raw === 'object') {
        for (const key of Object.keys(raw)) {
          const item = raw[key];
          if (item && item.name) {
            const line = `${item.name}: in ${item.sign || item.rashi || 'Unknown Sign'} (${item.house || '?'} House, Nakshatra: ${item.nakshatra || 'Unknown'})`;
            planetSummary.push(line);
            if (item.name.toLowerCase() === 'ascendant' || item.name.toLowerCase() === 'lagna') {
              lagnaInfo = `Ascendant (Lagna): ${item.sign || item.rashi}`;
            }
          }
        }
      }
    }

    // 2. Fetch Active Dasha from Vedic Astro API
    let activeDashaInfo = "";
    const dashaUrl = `https://api.vedicastroapi.com/v3-json/dashas/current-mahadasha?api_key=${vedicKey}&dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;
    const dashaRes = await fetch(dashaUrl).catch(() => null);
    if (dashaRes && dashaRes.ok) {
      const dashaJson = await dashaRes.json().catch(() => null);
      if (dashaJson && (dashaJson.response || dashaJson.status === 200)) {
        const dData = dashaJson.response || dashaJson;
        if (dData.mahadasha || dData.major) {
          activeDashaInfo = `Active Mahadasha: ${dData.mahadasha || dData.major} (Antardasha: ${dData.antardasha || dData.sub || 'Active'})`;
        }
      }
    }

    // Strict validation: stop if no ephemeris returned
    if (planetSummary.length === 0) {
      return new Response(
        JSON.stringify({ answer: "ASTRONOMICAL ENGINE ERROR: Unable to calculate verified planetary positions from ephemeris. Please verify birth details and try again." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const verifiedAstroContext = `VERIFIED MATHEMATICAL EPHEMERIS (GROUND TRUTH):
${lagnaInfo ? lagnaInfo + '\n' : ''}${activeDashaInfo ? activeDashaInfo + '\n' : ''}Planetary Positions:
${planetSummary.join('\n')}`;

    const clientSalutation = name ? `Dear ${name}` : 'Namaste';

    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords, Vimshottari Dasha, and classical Lal Kitab remedies.

MANDATORY ASTRONOMICAL GROUND TRUTH:
${verifiedAstroContext}

CLIENT PROFILE:
- Full Name: ${name || 'Seeker'}
- Gender: ${gender}
- Date of Birth: ${formattedDate}
- Time of Birth: ${formattedTime}
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language}

STRICT CONSTRAINTS:
1. Always open your reading addressing the client personally and respectfully by their name (e.g., "${clientSalutation}, ...").
2. STRICT MATHEMATICAL TRUTH: You MUST use ONLY the exact Ascendant (Lagna), Moon sign, Nakshatras, and planetary houses listed in the MANDATORY ASTRONOMICAL GROUND TRUTH above. NEVER invent, swap, or guess a different sign or dasha.
3. Speak with calm, definitive authority, tailoring insights directly to their question and chart.
4. Do not include meta-disclaimers like "consult an astrologer" or "not a substitute for professional advice".
5. Never quote consultation fees or offer private sessions.

${
  unlockedRemedy
    ? `PAID REMEDY MODE:
Provide the 9-WEEK LAL KITAB REMEDY PROTOCOL for ${name || 'the seeker'}:
1. Identify the root planetary friction causing obstacles in their query.
2. Detail an exact 9-week schedule with 2-3 specific non-commercial remedies.
3. Outline behavioral guidelines during this period.
Ensure the entire 9-week protocol is fully written out to completion.`
    : `FREE DIAGNOSIS MODE:
1. Address ${name || 'the seeker'} directly and analyze their verified Vedic chart foundations (verified Lagna, Moon Sign, Key Planets).
2. Provide timing and KP analysis directly answering their query based strictly on the verified planets above.
3. Identify the planetary bottleneck.
4. Conclude with this exact sentence:
"To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases. No markdown tables.`;

    const groqPayload = {
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2500
    };

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const groqResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(groqPayload)
    });

    const responseText = await groqResponse.text();
    let groqData = null;
    try {
      groqData = JSON.parse(responseText);
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ answer: "RAW GROQ ERROR (" + groqResponse.status + "): " + responseText.slice(0, 300) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!groqResponse.ok || !groqData || !groqData.choices || !groqData.choices.length) {
      const errDetail = groqData && groqData.error ? (groqData.error.message || JSON.stringify(groqData.error)) : responseText.slice(0, 300);
      return new Response(
        JSON.stringify({ answer: "GROQ API REJECTED (" + groqResponse.status + "): " + errDetail }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let answer = groqData.choices[0].message.content.trim();

    // Clean disclaimers
    answer = answer.replace(/Remember,?\s*these remedies are tailored.*?(?=\n|$)/gi, '');
    answer = answer.replace(/Seek guidance from a trusted.*?(?=\n|$)/gi, '');
    answer = answer.replace(/not a substitute for expert guidance.*?(?=\n|$)/gi, '');
    answer = answer.replace(/consult a qualified.*?astrologer.*?(?=\n|$)/gi, '');
    answer = answer.replace(/consult with an expert.*?(?=\n|$)/gi, '');
    answer = answer.replace(/Please consult.*?(?=\n|$)/gi, '').trim();

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ answer: "SERVER EXCEPTION: " + err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}
