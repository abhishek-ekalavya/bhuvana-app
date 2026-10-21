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

    // Baseline coordinates
    let astroContext = cachedAstroContext || `ASTRONOMICAL DATA: Ascendant (Lagna) in Cancer (Karka); Moon in Leo (Simha) in Magha Nakshatra; Sun & Mercury in Cancer (1st House); Saturn & Mars in Virgo (3rd House); Jupiter in Libra (4th House); Venus & Rahu in Gemini (12th House); Ketu in Sagittarius (6th House).`;

    // Only query external Vedic API if not cached (1 credit per session)
    if (!cachedAstroContext) {
      try {
        const vUrl = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?dob=${formattedDate}&tob=${formattedTime}&lat=19.2183&lon=73.0867&tz=5.5&api_key=${vedicKey}&lang=en`;
        const vRes = await fetch(vUrl);
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
        console.log("Vedic API fallback to baseline:", err.message);
      }
    }

    // Find whatever valid chat model exists on your key right now
    let selectedModel = null;
    let availableModels = [];

    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqKey}` }
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        availableModels = (modelsData.data || [])
          .map(m => m.id)
          .filter(id => 
            !id.includes('whisper') && 
            !id.includes('guard') && 
            !id.includes('vision') && 
            !id.includes('orpheus')
          );

        // Pick the best available text model from the active list
        selectedModel = availableModels.find(id => id.includes('versatile')) ||
                        availableModels.find(id => id.includes('instant')) ||
                        availableModels.find(id => id.includes('llama')) ||
                        availableModels[0];
      }
    } catch (e) {
      console.log("Model lookup error:", e.message);
    }

    if (!selectedModel) {
      return res.status(200).json({
        answer: "ENGINE ERROR: No active text models found on your Groq key. Available models: " + JSON.stringify(availableModels)
      });
    }

    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and practical Lal Kitab remedies.

VERIFIED ASTRONOMICAL GROUND TRUTH:
${astroContext}

CLIENT DETAILS:
- Date of Birth: ${dob} (${formattedDate})
- Time of Birth: ${tob} (${formattedTime})
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language} (If Hindi
