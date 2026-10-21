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

    // Default coordinates (Mumbai / Dombivli region)
    let lat = 19.2183;
    let lon = 73.0867;
    let tzone = 5.5;

    // Parse date and time
    let day = 23, month = 7, year = 1982, hour = 6, min = 21;
    if (dob && dob.includes('-')) {
      const parts = dob.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
    if (tob && tob.includes(':')) {
      const tparts = tob.split(':');
      hour = parseInt(tparts[0], 10);
      min = parseInt(tparts[1], 10);
    }

    // --- STEP 1: ASTRONOMICAL CALCULATION ENGINE ---
    let astroContext = "Planetary coordinates calculated via Vedic Ephemeris.";
    if (vedicKey) {
      try {
        const url = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?dob=${day}/${month}/${year}&tob=${hour}:${min}&lat=${lat}&lon=${lon}&tz=${tzone}&api_key=${vedicKey}&lang=en`;
        const vRes = await fetch(url);
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.response) {
            const planets = vData.response;
            const summary = Object.keys(planets)
              .filter(k => planets[k].name)
              .map(k => `${planets[k].name}: in ${planets[k].zodiac} (House ${planets[k].house}), Nakshatra: ${planets[k].nakshatra}`)
              .join('; ');
            astroContext = `VERIFIED ASTRONOMICAL POSITIONS (NON-NEGOTIABLE FACTS): ${summary}`;
          }
        }
      } catch (err) {
        console.error("Vedic API fetch error:", err);
      }
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
    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with mastery in Krishnamurti Paddhati (KP) Cuspal Sub-Lords and practical Lal Kitab remedies.

MATHEMATICAL CHART GROUND TRUTH (DO NOT DEVIATE OR INVENT):
${astroContext}

CLIENT DETAILS:
- Date of Birth: ${dob} (${day}/${month}/${year})
- Time of Birth: ${tob}
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language} (If Hindi -> pure Hindi. If Hinglish -> natural conversational Hinglish. Else -> clear, grounded English).

CRITICAL CONSTRAINTS:
1. Base all analysis strictly on the verified astronomical positions given above. Do not hallucinate or alter any house, sign, or Nakshatra placements.
2. Maintain an empathetic, grounded, and technical tone.
3. NEVER quote any consultation fee like ₹2,100, and never suggest phone calls or private sessions.

${
  unlockedRemedy
    ? `PAID REMEDY MODE (User has unlocked their ₹21 Dakshina prescription):
Provide an authentic, practical 9-WEEK LAL KITAB REMEDIAL REGIMEN:
1. Root Planetary Friction: Pinpoint which planetary placement in the verified chart requires pacification.
2. The 9-Week Routine:
   - Starting day of the week and exact time window.
   - 2 to 3 practical, non-commercial Lal Kitab remedies (e.g., feeding specific birds/cows/dogs, elemental placements, donations).
   - Rules of continuity for 9 weeks without break.
3. Behavioral Conduct: Lifestyle, speech, or ethical disciplines to maintain during these 9 weeks.`
    : `FREE DIAGNOSIS MODE:
Deliver an authentic, clear astrological reading:
1. Vedic Foundation: Rising sign (Lagna), Moon sign, Nakshatra, and key planetary houses based directly on the verified chart above.
2. KP Sub-Lord & Timing Analysis: Examine the relevant cusps (Houses 2, 6, 10, 11 for career; Houses 2, 7, 11 for relationships) and provide a clear, realistic timeline answering their question directly.
3. Root Bottleneck: State the exact planetary placement causing temporary friction.
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
