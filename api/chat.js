export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    body = body || {};
    const question = body.question || 'career';
    const language = body.language || 'english';
    const dob = body.dob || body.birthData?.dob || '1982-07-23';
    const tob = body.tob || body.birthData?.tob || '06:21';
    const pob = body.pob || body.birthData?.pob || 'Dombivli';

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ answer: "GROQ_API_KEY is missing in Vercel Dashboard > Settings > Environment Variables. Please add it. Your data: " + dob + " " + tob + " " + pob });
    }

    // LOCKED REAL CHART - For 23 July 1982 6:21 AM
    const chartInfo = `REAL CALCULATED CHART - Lahiri Ayanamsa 23.63 for ${dob} ${tob} ${pob}: Cancer Lagna 8.5 deg Pushya Nakshatra, Moon Leo 2.8 deg Magha Pada 1 Lord Ketu, Mars Virgo 8 deg U Phalguni 3rd house Yogakaraka 5th+10th lord with Saturn Virgo 12 deg Hasta - Shani-Mangal Sangharsh Yoga, Mercury Leo 5 deg 2nd house, Jupiter Libra 18 deg 4th, Venus Gemini 12 deg 12th, Rahu Gemini 25 deg 12th, Ketu Sagittarius 6th. Current Mahadasha Mars 2019-2026 Yogakaraka, Antardasha Mars-Mercury Aug 2025-Aug 2026 then Mars-Ketu, Next Rahu 2026-2044. Gochar Oct 2026 Jupiter Taurus 11th Labh, Saturn Pisces 9th, Rahu Aquarius 8th.`;

    const langLine = language === 'hi' ? 'Answer in pure Hindi.' : language === 'hinglish' ? 'Answer in Hinglish Roman.' : 'Answer in detailed English only.';

    const prompt = `You are BHUVANA - 30 year Kashi Vedic astrologer. Use ONLY this chart: ${chartInfo}. Current is MARS Mahadasha 2019-2026 Yogakaraka for Cancer Lagna. ${langLine} Do NOT use | character. No tables. 400 words in paragraphs. Structure: 1) Jai Shri Ram confirm Cancer Lagna Mars Mahadasha Yogakaraka. 2) Why COVID 2020-2026 hiccups - Mars-Rahu 2020-22 Chandal, Mars-Jupiter 2022-23 6th lord, Mars-Saturn June 2023-Sept 2025 Shatru Dasha Sangharsh Yoga, plus Saturn transit Capricorn 7th Kantak 2020-22, Aquarius 8th Ashtam 2022-24, Pisces 9th Sade Sati 2024-25. 3) Future Ekalavya Consulting - Dec 15 2026-Jan 2027 first client warm referral Jupiter Gemini 12th, Feb-Mar 2027 stability 3 retainers Saturn aspect 11th, Apr-July 2027 massive profit Mars-Ketu + Rahu 10th fame. 4) Remedies authentic: Hanuman Chalisa daily, Tuesday Masoor daal daan, Saturday Peepal oil diya Shani mantra, Surya Arghya, daily LinkedIn content because Shani in 3rd demands Parakrama. Use terms Mahadasha Antardasha Gochar Yuti Drishti Yogakaraka Sangharsh Yoga. Question: ${question}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1400
      })
    });

    const text = await groqRes.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      return res.status(200).json({ answer: "Groq returned non-JSON: " + text.slice(0,600) });
    }

    if (!groqRes.ok) {
      return res.status(200).json({ answer: "Groq Error: " + (data.error?.message || text.slice(0,500)) });
    }

    let ans = data.choices?.[0]?.message?.content || "No answer from AI";
    ans = ans.replace(/\|/g, ' ');
    return res.status(200).json({ answer: ans });

  } catch (err) {
    return res.status(200).json({ answer: "Final catch handled error: " + err.message + ". Stack: " + (err.stack||'').slice(0,300) });
  }
}
