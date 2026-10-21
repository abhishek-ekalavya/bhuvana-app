export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    
    // Capture user inputs from the front-end form
    const dob = body.dob || 'Not provided';
    const tob = body.tob || 'Not provided';
    const pob = body.pob || 'Not provided';
    const question = body.question || 'Please provide an overview of my current career and life phase.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ 
        answer: "SETUP ERROR: Add GROQ_API_KEY in Vercel > Settings > Environment Variables and Redeploy." 
      });
    }

    // Dynamic prompt combining Vedic, KP, and Lal Kitab logic
    const prompt = `You are BHUVANA — a deeply authentic, compassionate, and precise Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and Lal Kitab remedies. Speak with natural warmth, authority, and empathy. Never speak like a machine or a generic horoscope app.

CLIENT DETAILS:
- Date of Birth: ${dob}
- Time of Birth: ${tob}
- Place of Birth: ${pob}
- Client Question: "${question}"
- Preferred Language: ${language} (If Hindi -> pure Hindi in Devanagari script. If Hinglish -> natural conversational Hinglish. Else -> clear, grounded English).

CORE INSTRUCTIONS:
1. Formulate the Vedic Lagna, Moon Nakshatra, and operative Dasha based on the birth details provided.
2. Apply Krishnamurti Paddhati (KP) principles:
   - Examine the primary and supporting house cusps relevant to the question (e.g., Career: 2, 6, 10, 11; Marriage/Relationships: 2, 7, 11; Health: 1, 6, 8, 12).
   - Evaluate the Cuspal Sub-Lord and planetary significators to provide clear timing and direct answers.
3. Keep the tone grounded, empathetic, and direct. Start straight with the diagnosis.

${
  unlockedRemedy
    ? `PAID REMEDY MODE (User has unlocked the sacred prescription):
Deliver the complete, exhaustive 9-Week Lal Kitab Remedial Protocol:
1. Root Astrological Affliction: Exactly which planet/house sub-lord is causing the block.
2. The 9-Week Action Protocol: Day of the week, precise time window (e.g., Tuesday before sunset), and step-by-step actions (food offerings, symbolic donations, element/metal rules, and behavioral conduct).
3. Critical Precautions: Specific dos and don'ts during these 9 weeks to maintain the ritual energy.`
    : `FREE DIAGNOSIS MODE:
Deliver an authentic, clear astrological reading structured into these sections:
1. Lagna & Planetary Landscape: Rising sign, key planetary influences, and current operative Dasha period.
2. KP Sub-Lord & Timing Analysis: Direct, honest answer to their question. Explain the cosmic timeline, ongoing frictions, and favorable upcoming windows.
3. Root Cause Diagnosis: Pinpoint the specific planetary placement or cuspal sub-lord causing the bottleneck.
4. Prescriptive Guidance & Remedy Lock:
   - Explain that while planetary cycles test resilience, targeted Lal Kitab totkas (remedies) are designed to redirect this energy.
   - Inform them that a customized 9-week Lal Kitab protocol is available for their specific chart.
   - Do NOT give the full step-by-step ritual yet. End with: "Unlock the personalized 9-week Lal Kitab Remedial Protocol (₹21 Dakshina) to begin your corrective cycle."`
}

FORMAT RULES:
- Write in clean, structured paragraphs with bold key phrases.
- Do NOT use markdown tables or pipe (|) characters.
- Keep the guidance empathetic, practical, and deeply authentic.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.65,
        max_tokens: 2200
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(200).json({ 
        answer: "GROQ ERROR: " + (data.error?.message || JSON.stringify(data).slice(0, 800)) 
      });
    }

    let answer = data.choices?.[0]?.message?.content || "No answer generated";
    answer = answer.replace(/\|/g, ' ').trim();

    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(200).json({ answer: "Server error handled: " + e.message });
  }
}
