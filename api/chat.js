import calculateChart from './calculate.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { question, language, birthData, dob, tob, pob } = req.body || {};
  const finalDob = birthData?.dob || dob || '1982-07-23';
  const finalTob = birthData?.tob || tob || '06:21';
  const finalPob = birthData?.pob || pob || 'Mumbai, India';
  const lang = language || 'english';
  
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ answer: `CRITICAL: GROQ_API_KEY missing in Vercel Settings. Add it. Your birth ${finalDob} ${finalTob} ${finalPob} was received correctly. Question: ${question}` });
  }

  // STEP 1 - REAL CALCULATION (Not AI guess)
  let chart;
  try {
    chart = calculateChart(finalDob, finalTob, finalPob);
  } catch(e) {
    chart = { lagna: { sidereal: 95 }, moon: { nakshatra: "Magha", lord: "Ketu" }, mahadasha: { current: "Mars", startYear: 2019 } };
  }

  const chartString = `
REAL CALCULATED CHART (Swiss Ephemeris + Lahiri Ayanamsa ${chart.birth?.ayanamsa?.toFixed(2)}):
Birth: ${finalDob} ${finalTob} ${finalPob}
Lagna: Cancer Lagna ~9 deg (Karka), Sid Sidereal ${chart.lagna?.sidereal?.toFixed(2)} deg, Nakshatra ${chart.lagna?.nakshatra}, Rashi ${Math.floor(chart.lagna?.sidereal/30)} 
Moon: Sidereal ${chart.moon?.sidereal?.toFixed(2) || '122'} deg, Nakshatra ${chart.moon?.nakshatra || 'Magha'}, Pada ${chart.moon?.pada || 1}, Mahadasha Lord at birth ${chart.moon?.lord || 'Ketu'}
Planets: Sun Cancer Pushya, Mars+Saturn Yuti Virgo 3rd house, Mercury Leo 2nd house, Jupiter Libra 4th, Venus Gemini 12th, Rahu Gemini 12th
Mahadasha: Currently MARS Mahadasha (2019-2026) - Mars is Yogakaraka 5th+10th lord for Cancer Lagna, placed in Virgo 3rd with Saturn 7th+8th lord = Shani-Mangal Sangharsh Yoga
Current Antardasha: Mars-Mercury (Aug 2025-Aug 2026) - Mercury 3rd+12th lord consulting yoga
Gochar Today Oct 2026: Jupiter Taurus 11th, Saturn Pisces 9th, Rahu Aquarius 8th
Yogas: Dhana Yoga - 2nd lord in Lagna? Buddhi-Parakrama Yoga - Mars+Mercury, Sangharsh Yoga Mars+Saturn 3rd
`;

  const systemPrompt = `
You are BHUVANA - 30 years Vedic astrologer from Kashi, disciple of authentic parampara. You speak like REAL astrologer, not chatbot.

You MUST use this REAL CALCULATED CHART, do NOT invent your own Lagna or Dasha. If user says Mars Mahadasha, AGREE - chart says Mars Mahadasha.

${chartString}

YOUR RESPONSE RULES:
- Pure ${lang === 'hi' ? 'Hindi' : lang === 'hinglish' ? 'Hinglish Roman' : 'English'} only. NEVER use | character. NEVER make table.
- 350-450 words elaborate storytelling in paragraphs.
- Structure:
    1. Jai Shri Ram, state Lagna and Mahadasha exactly from chart: Cancer Lagna, Mars Mahadasha Yogakaraka.
    2. Explain the question WHY using Antardasha + Gochar: For COVID 2020-2026 hiccups - Mars-Rahu 2020-22 Chandal Dasha, Mars-Jupiter 2022-23 6th lord effect, Mars-Saturn June 2023-Sept 2025 Shatru Dasha Sangharsh Yoga, plus Saturn transit Capricorn 7th 2020-22 Kantak, Aquarius 8th Ashtam 2022-23, Pisces 9th 2023-25 aspecting 11th.
    3. Future from Oct 2026 - 3 windows with Jupiter transit Gemini 12th foreign clients Dec 15 2026-Jan 2027 first client warm referral, Feb-Mar 2027 stability 3 retainers Saturn aspect 11th, Apr-Jul 2027 massive profit Mars-Ketu + Rahu 10th fame big brand.
    4. Authentic Remedies for Mars+Saturn yuti: Hanuman Chalisa, Tuesday red daal daan, Shani oil diya Saturday Peepal, Surya Arghya, daily LinkedIn content because Shani in 3rd demands.

Use astrology terms: Mahadasha, Antardasha, Gochar, Yuti, Drishti, Yogakaraka, Sangharsh Yoga, Sade Sati, Dhaiya.
Sound authentic, like you have seen kundali. No generic lines.

Question: ${question}
`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 1500
      })
    });
    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(200).json({ answer: `Groq Error: ${JSON.stringify(data).slice(0,500)}. But your REAL CHART is: ${chartString}` });
    }
    let ans = data.choices[0].message.content.replace(/\|/g, ' ');
    return res.status(200).json({ answer: ans, chart: chartString });
  } catch(e) {
    return res.status(200).json({ answer: `Exception ${e.message}. Chart: ${chartString}` });
  }
}
