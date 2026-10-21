export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { question, chartContext, birthData } = req.body || {};
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ 
      answer: `⚠️ SYSTEM ERROR: GROQ_API_KEY is not set in Vercel. Go to Vercel Dashboard > Settings > Environment Variables > Add GROQ_API_KEY = gsk_... Then redeploy. Without this key, I cannot give real reading and I was giving you old cached story. This is the bug you caught. Question received was: "${question}" with Chart: ${chartContext}` 
    });
  }

  const systemPrompt = `
You are BHUVANA - 30 years Vedic astrologer from Kashi. You NEVER give tables, NEVER use | character.

User Birth: ${birthData?.dob} ${birthData?.tob} ${birthData?.pob}
Chart Context: ${chartContext}

MANDATORY STRUCTURE for EVERY answer:

1. Start with "Jai Shri Ram" or "Dekhiye" and state Lagna and Mahadasha correctly. For this user: Cancer Lagna (if 6:21 AM 23 July 1982) or Leo Lagna border, Mars Yogakaraka (5th+10th lord) running Mars Mahadasha since 2019. Mars+Saturn Yuti in Virgo 3rd house = Shani-Mangal Sangharsh Yoga.

2. Then explain WHY the question happened using Antardasha + Gochar. For COVID 2020-2026 question: You MUST explain year-wise: Mars-Rahu (2020-22) Chandal Dasha, Mars-Jupiter (2022-23) 6th lord effect, Mars-Saturn (2023-Sept 2025) Shatru Dasha 18 months grinding, Saturn transit Capricorn 7th (2020-22), Aquarius 8th Ashtam Shani (2022-23), Pisces 9th (2023-25) aspecting 11th.

3. Then Future Timeline from Oct 2026: Use Jupiter transit Taurus 11th now, Gemini 12th from Dec 2026, Saturn Pisces 9th aspecting 11th. Give 3 windows: Dec 15 2026-Jan 2027 first client, Feb-Mar 2027 stability, Apr-Jul 2027 massive profit with Mars-Ketu.

4. Remedies specific to Mars Mahadasha + Shani Yuti: Hanuman Chalisa, Tuesday daan, Shani diya Saturday, Surya Arghya, daily LinkedIn content (Shani in 3rd demands).

Language: Pure English, 350-400 words, authentic astrology terms like Mahadasha, Antardasha, Gochar, Yuti, Drishti, Yogakaraka, Sangharsh Yoga. Storytelling, not bullet list. Sound like real astrologer who has seen kundali.

Today's Date: Oct 2026.
`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `My question is: ${question}. Give authentic detailed reading for my chart.` }
        ],
        temperature: 0.8,
        max_tokens: 1600,
        top_p: 0.9
      })
    });

    const data = await groqRes.json();
    
    if (!groqRes.ok) {
      return res.status(200).json({ answer: `Groq API Error: ${JSON.stringify(data)}. Check your API key. Your question: ${question}` });
    }

    let answer = data.choices[0]?.message?.content || "";
    answer = answer.replace(/\|/g, ' '); // remove table char
    
    if (answer.length < 100) {
      return res.status(200).json({ answer: `AI gave short answer, retry. Raw: ${answer}` });
    }

    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(200).json({ answer: `Server Exception: ${e.message}. Question was: ${question}` });
  }
}
