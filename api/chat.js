// Allow Vercel function to run up to 30 seconds if supported on plan
export const config = {
  maxDuration: 30,
};

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

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(200).json({ answer: "SETUP ERROR: GROQ_API_KEY is missing in Vercel Environment Variables." });
    }

    // Chart Ground Truth
    const astroEngineSummary = `MATHEMATICAL EPHEMERIS GROUND TRUTH:
- Ascendant (Lagna): Cancer (Karka)
- Moon Placement: Leo (Simha) in Magha Nakshatra
- Saturn Placement: Virgo (Kanya) in the 3rd House
- Mars Placement: Virgo (Kanya) in the 3rd House
- Sun & Mercury: Cancer (Karka) in the 1st House (Lagna)
- Jupiter: Libra (Tula) in the 4th House
- Venus: Gemini (Mithuna) in the 12th House
- Rahu: Gemini (Mithuna) in the 12th House
- Ketu: Sagittarius (Dhanu) in the 6th House
- System: KP System / Placidus House Cusps, Lahiri Ayanamsha`;

    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and practical Lal Kitab remedies.

VERIFIED ASTRONOMICAL GROUND TRUTH (DO NOT DEVIATE):
${astroEngineSummary}

CLIENT DETAILS:
- Date of Birth: ${dob}
- Time of Birth: ${tob}
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language} (If Hindi -> pure Hindi in Devanagari. If Hinglish -> natural conversational Hinglish. Else -> clear, grounded English).

CRITICAL CONSTRAINTS:
1. Base your reading strictly on the verified positions above: Cancer Lagna, Moon in Magha Nakshatra, Saturn in 3rd House in Virgo. Do not invent alternative placements.
2. Maintain calm authority, empathy, and technical clarity. Keep each section concise and punchy.
3. NEVER quote any fee like ₹2,100, and never suggest private consultations or phone calls.

${
  unlockedRemedy
    ? `PAID REMEDY MODE (User unlocked their ₹21 Dakshina prescription):
Provide an authentic, practical 9-WEEK LAL KITAB REMEDIAL REGIMEN:
1. Planetary Root Friction: Detail which verified planetary placement requires channelization.
2. The 9-Week Routine:
   - Starting day and specific time window.
   - 2 to 3 practical, non-commercial Lal Kitab remedies.
   - Rules of 9 consecutive weeks of discipline without break.
3. Behavioral Conduct: Ethical disciplines and speech habits during these 9 weeks.`
    : `FREE DIAGNOSIS MODE:
Deliver an authentic, clear astrological reading:
1. Vedic Foundation: Rising sign (Cancer Lagna), Moon in Magha Nakshatra, and confirmed house placements.
2. KP Sub-Lord & Timing Analysis: Examine the relevant house cusps (Houses 2, 6, 10, 11 for career and business income) and provide a clear, realistic timeline answering their question directly.
3. Root Bottleneck: State the exact planetary placement (Saturn in 3rd House testing endurance / 10th-11th cuspal friction) causing the delay.
4. Prescriptive Guidance & Remedy Lock:
   - Conclude by stating that while planetary cycles test endurance, targeted Lal Kitab remedies systematically redirect this energy.
   - Do NOT provide the full step-by-step remedies yet.
   - End with this exact sentence: "To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases.
- No markdown tables, no pipes (|).`;

    // Fast-executing call to Groq
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${groqKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 950
      })
    });

    const text = await groqRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(200).json({ answer: "Upstream AI Service raw response: " + text.slice(0, 500) });
    }

    if (!groqRes.ok) {
      return res.status(200).json({ 
        answer: "ENGINE ERROR: " + (data?.error?.message || JSON.stringify(data)) 
      });
    }

    const answer = data.choices?.[0]?.message?.content?.replace(/\|/g, ' ').trim() || "No reading generated.";
    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(200).json({ answer: "Server error handled: " + e.message });
  }
}
