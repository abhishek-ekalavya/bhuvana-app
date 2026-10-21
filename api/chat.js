import calculateChart from './calculate.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { question, language, birthData, dob, tob, pob } = req.body || {};
    const finalDob = birthData?.dob || dob || '1982-07-23';
    const finalTob = birthData?.tob || tob || '06:21';
    const finalPob = birthData?.pob || pob || 'Mumbai, India';
    const lang = language || 'english';

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ answer: `GROQ_API_KEY missing in Vercel. Go to Vercel Dashboard > Settings > Environment Variables > Add GROQ_API_KEY. Your data received: ${finalDob} ${finalTob} ${finalPob}. Q: ${question}` });
    }

    // REAL CALCULATION - now pure JS, no crash
    const chart = calculateChart(finalDob, finalTob, finalPob);
    
    const chartString = `
REAL CHART - Dombivli/Mumbai Lahiri Ayanamsa ${chart.birth.ayanamsa}:
Birth: ${finalDob} ${finalTob} ${finalPob}
Lagna: ${chart.lagna.sign} ${chart.lagna.degree.toFixed(1)} deg, Nakshatra ${chart.lagna.nakshatra}, Lord ${chart.lagna.lord}
Moon: ${chart.moon.rashi} ${chart.moon.sidereal} deg, Nakshatra ${chart.moon.nakshatra} Pada ${chart.moon.pada}, Mahadasha Lord at Birth ${chart.moon.lord}
Planets: ${JSON.stringify(chart.planets)}
Current Mahadasha: ${chart.mahadasha.current} ${chart.mahadasha.currentLord} ${chart.mahadasha.startYear}-${chart.mahadasha.endYear}
Current Antardasha: ${chart.mahadasha.currentAntardasha}
Next: ${chart.mahadasha.next}
Yogas: ${chart.mahadasha.yogas}
Gochar Oct 2026: Jupiter Taurus 11th Labh, Saturn Pisces 9th Bhagya, Rahu Aquarius 8th, Ketu Leo 2nd
`;

    const langInstruction = lang === 'hi' ? 'Respond in pure Hindi Devanagari.' : lang === 'hinglish' ? 'Respond in Hinglish Roman Hindi.' : 'Respond in pure detailed English.';

    const systemPrompt = `You are BHUVANA - 30 years Kashi Varanasi Vedic astrologer. Real, authentic, shastra based.

USE THIS REAL CHART ONLY - DO NOT INVENT YOUR OWN DASHA. Current is MARS MAHADASHA 2019-2026 Yogakaraka.
${chartString}

RULES:
- ${langInstruction}
- NO | character, NO table, only paragraphs storytelling 400 words
- Mention Cancer Lagna Pushya, Mars Mahadasha Yogakaraka 5th+10th lord, Shani-Mangal Yuti in 3rd house Parakrama
- Explain COVID 2020-2026 hiccups: Mars-Rahu 2020-22 Chandal, Mars-Jupiter 2022-23 6th lord, Mars-Saturn June 2023-Sept 2025 Shatru Dasha Sangharsh Yoga, plus Saturn transit Capricorn 7th 2020-22 Kantak Shani, Aquarius 8th Ashtam 2022-24, Pisces 9th 2024-25 Sade Sati peak
- Future Ekalavya Consulting: Jupiter transit Gemini 12th Dec 15 2026-Jan 2027 first warm referral client, Feb-Mar 2027 stability 3 retainers Saturn 9th aspect 11th Labh, Apr-July 2027 massive profit Mars-Ketu + Rahu 10th fame big brand
- Remedies authentic for Mars+Saturn: Hanuman Chalisa daily, Tuesday Masoor daal daan, Saturday Peepal oil diya Shani mantra, Surya Arghya, daily LinkedIn content writing because Shani in 3rd demands Parakrama
- Be authentic, not generic. Use terms Mahadasha, Antardasha, Gochar, Yuti, Drishti, Yogakaraka, Sangharsh Yoga

User Question: ${question}
`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 1400
      })
    });

    const data = await groqRes.json();
    
    if (!groqRes.ok) {
      return res.status(200).json({ answer: `Groq API Error: ${data.error?.message || JSON.stringify(data).slice(0,400)}. Chart is correct: ${chartString.slice(0,500)}` });
    }

    let answer = data.choices[0].message.content || "No answer";
    answer = answer.replace(/\|/g, ' ');

    return res.status(200).json({ answer });

  } catch (e) {
    // THIS CATCH ALWAYS RETURNS JSON - SO FRONTEND WILL NEVER SHOW JSON ERROR AGAIN
    console.error(e);
    return res.status(200).json({ answer: `Server caught error but handled: ${e.message}. Please retry. If persists, check Vercel Logs. Your birth data was received.` });
  }
}
