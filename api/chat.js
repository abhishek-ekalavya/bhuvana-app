export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = {};
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch(err) { body = {}; }
    } else if (req.body) {
      body = req.body;
    }
    
    const dob = body.dob || '1982-07-23';
    const tob = body.tob || '06:21';
    const pob = body.pob || 'Dombivli';
    const question = body.question || 'Please provide an overview of my current career and life phase.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;
    const cachedAstroContext = body.cachedAstroContext || null;

    const groqKey = process.env.GROQ_API_KEY;
    const vedicKey = process.env.VEDIC_API_KEY || '4fe43c11-5aa9-54d1-8211-4c399d4d671c';

    if (!groqKey) {
      return res.status(200).json({ answer: "SETUP ERROR: GROQ_API_KEY is missing in Vercel Environment Variables." });
    }

    // Format Date: DD/MM/YYYY
    let day = '23', month = '07', year = '1982';
    if (dob && dob.includes('-')) {
      const parts = dob.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    }
    const formattedDate = `${day}/${month}/${year}`;

    let formattedTime = '06:21';
    if (tob && tob.includes(':')) {
      const tparts = tob.split(':');
      formattedTime = `${tparts[0].padStart(2, '0')}:${tparts[1].padStart(2, '0')}`;
    }

    // Baseline coordinates for Dombivli
    let astroContext = cachedAstroContext || `ASTRONOMICAL DATA: Ascendant (Lagna) in Cancer (Karka); Moon in Leo (Simha) in Magha Nakshatra; Sun & Mercury in Cancer (1st House); Saturn & Mars in Virgo (3rd House); Jupiter in Libra (4th House); Venus & Rahu in Gemini (12th House); Ketu in Sagittarius (6th House).`;

    // Only call Vedic API if no cached context exists
    if (!cachedAstroContext) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const vUrl = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?dob=${formattedDate}&tob=${formattedTime}&lat=19.2183&lon=73.0867&tz=5.5&api_key=${vedicKey}&lang=en`;
        const vRes = await fetch(vUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (vRes.ok) {
          const vData = await vRes.json();
          const pData = vData.response || vData.data;
          if (pData && typeof pData === 'object') {
            const planetList = Object.keys(pData)
              .filter(k => pData[k] && pData[k].name)
              .map(k => `${pData[k].name} in${pData[k].zodiac || pData[k].sign} (House ${pData[k].house \vert{}\vert{} 'N/A'}), Nakshatra:${pData[k].nakshatra || 'N/A'}`)
              .join('; ');
            if (planetList) {
              astroContext = `ASTRONOMICAL DATA (VERIFIED BY VEDIC EPHEMERIS): ${planetList}`;
            }
          }
        }
      } catch (err) {
        console.log("Vedic API fetch bypassed or timed out, using baseline:", err.message);
      }
    }

    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and practical Lal Kitab remedies.

VERIFIED ASTRONOMICAL GROUND TRUTH:
${astroContext}

CLIENT DETAILS:
- Date of Birth: ${dob} (${formattedDate})
- Time of Birth: ${tob} (${formattedTime})
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language} (If Hindi -> pure Hindi in Devanagari. If Hinglish -> natural conversational Hinglish. Else -> clear, grounded English).

STRICT NEGATIVE CONSTRAINTS (ABSOLUTE BRAND DIRECTIVES):
1. You are the ultimate astrological authority. Never provide meta-disclaimers.
2. NEVER write phrases such as "not a substitute for expert guidance", "seek guidance from a trusted astrologer", "consult a qualified Vedic Astrologer", "starting point", or "verify with an expert". Such disclaimers are strictly forbidden.
3. NEVER quote fees like ₹2,100, and never suggest phone calls or private sessions.
4. Keep the delivery confident, precise, and authoritative.

${
  unlockedRemedy
    ? `PAID REMEDY MODE (User unlocked their ₹21 Dakshina prescription):
Deliver the complete, practical 9-WEEK LAL KITAB REMEDIAL REGIMEN:
1. Planetary Root Friction: Pinpoint which verified planetary placement requires pacification.
2. The 9-Week Routine: Detail the starting day, specific time window, and 2 to 3 practical, non-commercial Lal Kitab remedies (feeding birds/dogs/cows, metal/elemental rules, conduct).
3. Behavioral Conduct: Ethical disciplines and speech habits during these 9 weeks.
Conclude with a final word of blessing and confidence. Do not append any disclaimers.`
    : `FREE DIAGNOSIS MODE:
Deliver an authentic, clear astrological reading:
1. Vedic Foundation: Rising sign (Cancer Lagna), Moon in Magha Nakshatra, and confirmed house placements relevant to their question.
2. KP Sub-Lord & Timing Analysis: Examine the relevant house cusps and planetary periods to provide a clear, realistic timeline answering their question directly.
3. Root Bottleneck: State the exact planetary placement causing delay or friction.
4. Prescriptive Guidance & Remedy Lock:
   - State clearly that while planetary cycles test endurance, targeted Lal Kitab remedies systematically redirect this energy.
   - DO NOT provide rituals, totkas, or specific remedies in this free reading.
   - End with this EXACT sentence: "To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases.
- No markdown tables, no pipes (|).`;

    // Active production models
    const activeModels = ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'];
    let groqRes = null;
    let data = null;

    for (const modelId of activeModels) {
      try {
        groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer
