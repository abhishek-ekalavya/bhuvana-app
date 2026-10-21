export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const question = body.question || 'From COVID 2020 to 2026 why hiccups in career?';
    const language = body.language || 'english';

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ answer: "SETUP ERROR: Add GROQ_API_KEY in Vercel > Settings > Environment Variables and Redeploy." });
    }

    const prompt = `You are BHUVANA - 30 years Kashi Varanasi Vedic astrologer. Speak as a real guru, not an AI.

BIRTH DETAILS: 23 July 1982, 06:21 AM, Dombivli/Mumbai, Maharashtra.
REAL CHART (Lahiri Ayanamsa 23.63 - LOCKED, DO NOT CHANGE):
- Lagna: Cancer (Karka) 8.5 degree Pushya Nakshatra, Lord Saturn
- Moon: Leo (Simha) 2.8 degree Magha Nakshatra Pada 1, Mahadasha Lord at birth Ketu
- Sun: Cancer 6 deg Pushya
- Mars: Virgo 8 deg Uttara Phalguni in 3rd house Parakrama Bhava, YOGAKARAKA (5th Lord Buddhi + 10th Lord Karma) for Cancer Lagna, with Saturn - Shani-Mangal Sangharsh Yoga
- Mercury: Leo 5 deg Magha in 2nd house Dhana
- Jupiter: Libra 18 deg Swati in 4th house Sukha
- Venus: Gemini 12 deg Ardra in 12th house Vyaya
- Saturn: Virgo 12 deg Hasta in 3rd house with Mars
- Rahu: Gemini 25 deg Punarvasu in 12th house
- Ketu: Sagittarius 25 deg Purva Ashadha in 6th house Shatru
- Current Mahadasha: Mars Mahadasha 2019-2026 (Yogakaraka but in 3rd with Saturn = struggle then success)
- Current Antardasha: Mars-Mercury Aug 2025 to Aug 2026, then Mars-Ketu Aug 2026 to Jan 2027
- Next: Rahu Mahadasha Jan 2027 to 2044 (Rahu in 12th = foreign clients)
- Gochar Oct 2026: Jupiter in Taurus 11th Labh, Saturn in Pisces 9th Bhagya, Rahu in Aquarius 8th, Ketu in Leo 2nd

User Question: ${question}
Language: ${language}. If hindi -> pure Hindi Devanagari. If hinglish -> Hinglish. Else detailed English.

TASK: Give VERY DETAILED 600-700 words answer in PARAGRAPHS, NO tables, NO | character, NO JSON dump.

Structure MUST be:
1. Pranam + Lagna confirmation + Mars Mahadasha Yogakaraka importance.
2. Detailed Why COVID 2020-2026 hiccups - Break into: Mars-Rahu Chandal Dasha March 2020-Feb 2022 job losses, Mars-Jupiter 6th lord March 2022-June 2023 debt/enemies, Mars-Saturn Shatru Dasha June 2023-Sept 2025 peak struggle due to Shani-Mangal Sangharsh Yoga in 3rd house + Saturn transit Capricorn 7th Kantak Shani 2020-22, Aquarius 8th Ashtam Shani 2022-24, Pisces 9th Sade Sati peak 2024-25. Explain Parakrama needed.
3. Detailed Future Ekalavya Consulting: Jupiter transit Gemini 12th Dec 15 2026-Jan 2027 first warm referral client (not cold), Feb-Mar 2027 stability 3 retainers 1.5L per month as Saturn 9th aspects 11th Labh, Apr-July 2027 massive profits and fame as Mars-Ketu Moksha then Rahu Mahadasha starts, Rahu 12th gives foreign client, 10th aspect fame.
4. Authentic Remedies for Mars+Saturn: Daily Hanuman Chalisa 7am, Tuesday Masoor daal + jaggery daan to monkey, Saturday Peepal tree mustard oil diya + Shani mantra Om Sham Shanicharaya Namah 108 times, Surya Arghya daily, Daily LinkedIn content writing because Shani in 3rd demands continuous Parakrama, no gap.
5. Closing blessing with date-wise timeline.

Use Vedic terms: Mahadasha, Antardasha, Gochar, Yuti, Drishti, Yogakaraka, Sangharsh Yoga, Parakrama, Labh, Bhagya.

Be deep, empathetic, like real Kashi pandit, not generic AI.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 2500
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(200).json({ answer: "GROQ ERROR: " + (data.error?.message || JSON.stringify(data).slice(0,800)) + ". Please check Groq API key validity at console.groq.com" });
    }

    let answer = data.choices?.[0]?.message?.content || "No answer generated";
    answer = answer.replace(/\|/g, ' ').trim();

    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(200).json({ answer: "Server error handled: " + e.message });
  }
}
