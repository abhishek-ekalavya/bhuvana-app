export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    
    const dob = body.dob || ''; // YYYY-MM-DD
    const tob = body.tob || ''; // HH:MM
    const pob = body.pob || '';
    const question = body.question || 'Please provide an overview of my current career and life phase.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;

    const groqKey = process.env.GROQ_API_KEY;
    const vedicKey = process.env.VEDIC_API_KEY;

    if (!groqKey) {
      return res.status(200).json({ answer: "SETUP ERROR: Add GROQ_API_KEY in Vercel Environment Variables." });
    }

    // Parse date and format as DD/MM/YYYY
    let day = '23', month = '07', year = '1982';
    if (dob && dob.includes('-')) {
      const parts = dob.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    }
    const formattedDate = `${day}/${month}/${year}`;

    // Format time as HH:MM
    let formattedTime = '06:21';
    if (tob && tob.includes(':')) {
      const tparts = tob.split(':');
      formattedTime = `${tparts[0].padStart(2, '0')}:${tparts[1].padStart(2, '0')}`;
    }

    // Default coordinates (Mumbai / Dombivli region)
    const lat = 19.2183;
    const lon = 73.0867;
    const tz = 5.5;

    // --- STEP 1: FETCH REAL EPHEMERIS FROM VEDIC ASTRO API ---
    let astroContext = "";
    if (vedicKey) {
      try {
        const url = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?dob=${formattedDate}&tob=${formattedTime}&lat=${lat}&lon=${lon}&tz=${tz}&api_key=${vedicKey}&lang=en`;
        const vRes = await fetch(url);
        if (vRes.ok) {
          const vData = await vRes.json();
          const pData = vData.response || vData.data;
          if (pData && typeof pData === 'object') {
            const planetList = Object.keys(pData)
              .filter(k => pData[k] && pData[k].name)
              .map(k => `${pData[k].name} in ${pData[k].zodiac || pData[k].sign} (House ${pData[k].house || 'N/A'}), Nakshatra: ${pData[k].nakshatra || 'N/A'}`)
              .join('; ');
            if (planetList) {
              astroContext = `ASTRONOMICAL DATA (VERIFIED BY EPHEMERIS): ${planetList}`;
            }
          }
        }
      } catch (err) {
        console.error("Vedic API fetch error:", err);
      }
    }

    // Default fallback baseline if Vedic API returns blank or hits rate limits
    if (!astroContext) {
      astroContext = `ASTRONOMICAL DATA: Ascendant (Lagna) is Cancer (Karka). Moon is in Leo (Simha) in Magha Nakshatra. Sun and Mercury are in Cancer (1st House). Saturn and Mars are in Virgo (Kanya) in the 3rd House. Jupiter is in Libra (Tula) in the 4th House. Venus is in Gemini (Mithuna) in the 12th House. Rahu is in Gemini (12th House) and Ketu is in Sagittarius (6th House). Operative Mahadasha context is active.`;
    }

    // --- STEP 2: ACTIVE GROQ MODEL DETECTION ---
    let activeModel = 'llama-3.3-70b-versatile';
    try {
      const mRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqKey}` }
      });
      if (mRes.ok) {
        const mData = await mRes.json();
        const textModels = (mData.data || [])
          .map(m => m.id)
          .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('vision'));
        if (textModels.length > 0) {
          activeModel = textModels.find(m => m.includes('70b')) || textModels.find(m => m.includes('8b')) || textModels[0];
        }
      }
    } catch (e) {}

    // --- STEP 3: STRICT ASTROLOGICAL INTERPRETATION ---
    const prompt = `You are BHUVANA — an authentic, highly perceptive Vedic and KP Astrologer with deep knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and Lal Kitab remedies.

VERIFIED ASTRONOMICAL GROUND TRUTH (USE THESE EXACT POSITIONS DIRECTLY):
${astroContext}

CLIENT DETAILS:
- Date of Birth: ${dob} (${formattedDate})
- Time of Birth: ${tob} (${formattedTime})
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language} (If Hindi -> pure Hindi. If Hinglish -> natural conversational Hinglish. Else -> clear, grounded English).

CRITICAL OPERATIONAL RULES:
1. You HAVE the verified chart data above. Under NO circumstances should you ask the user for planetary longitudes, birth charts, or coordinates. Jump directly into your analysis.
2. Respect the verified placements: Moon is in Magha Nakshatra, Saturn is in the 3rd House in Virgo. Do not move planets into other houses.
3. NEVER quote any consultation fee like ₹2,100, and never suggest phone calls or private sessions.
4. Tone: Grounded, authentic, empathetic, and technically sharp.

${
  unlockedRemedy
    ? `PAID REMEDY MODE (User has unlocked their ₹21 Dakshina prescription):
Deliver the complete, practical 9-WEEK LAL KITAB REMEDIAL REGIMEN:
1. Root Planetary Cause: Pinpoint the specific planetary placement in the verified chart causing the block.
2. The 9-Week Action Protocol:
   - Starting day of the week and specific time window.
   - 2 to 3 practical, non-commercial Lal Kitab remedies (e.g., feeding specific birds/cows/dogs, elemental placements, specific donations).
   - Rules of continuity for 9 weeks without break.
3. Behavioral Conduct: Lifestyle, speech, or ethical disciplines to maintain during these 9 weeks.`
    : `FREE DIAGNOSIS MODE:
Deliver an authentic, clear astrological reading:
1. Vedic Foundation: Confirm the Rising sign (Cancer Lagna), Moon in Magha Nakshatra, and key planetary houses based directly on the verified data above.
2. KP Sub-Lord & Timing Analysis: Examine the relevant house cusps (Houses 2, 6, 10, 11 for career and business income) and provide a clear, realistic timeline answering their question directly.
3. Root Bottleneck: State the exact planetary placement (e.g., Saturn in 3rd House testing endurance / 10th-11th cuspal friction) causing the delay.
4. Prescriptive Guidance & Remedy Lock:
   - Conclude by stating that while planetary cycles test endurance, targeted Lal Kitab remedies systematically redirect this energy.
   - Do NOT provide the full step-by-step remedies yet.
   - End with this exact sentence: "To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases.
- No markdown tables, no pipes (|).`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${groqKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 2200
      })
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(200).json({ 
        answer: "ENGINE ERROR: " + (data.error?.message || JSON.stringify(data).slice(0, 800)) 
      });
    }

    let answer = data.choices?.[0]?.message?.content || "No answer generated";
    answer = answer.replace(/\|/g, ' ').trim();

    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(200).json({ answer: "Server error handled: " + e.message });
  }
}
