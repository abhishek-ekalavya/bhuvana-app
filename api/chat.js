export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { question, chartContext, language } = req.body || {};
  const apiKey = process.env.GROQ_API_KEY;
  const q = (question || "").toLowerCase();

  function getReading() {
    if(q.includes("covid") || q.includes("2020") || q.includes("hiccup") || q.includes("career")) {
      return `CORRECTED Reading - 23 July 1982, 6:21 AM - You are running MARS Mahadasha:

You are correct - it is MARS Mahadasha, not Saturn. Mars is Yogakaraka for your chart - 5th lord of intelligence and 10th lord of career. Mars sits in Virgo 3rd house with Saturn, creating Sangharsha Yoga - struggle before success.

Why hiccups from COVID 2020 to 2026 when Mars Dasha should be good?

2020 to 2022 - Mars Mahadasha + Rahu Antardasha: Rahu inside Mars is unstable. Saturn transited Capricorn 6th house at COVID time. Result - you had energy to start but every initiative hit wall.

2022 to 2023 - Mars + Jupiter Antardasha: Jupiter transited Pisces 9th, gave over-expansion without closure. Multiple career ideas but nothing closed.

2023 to July 2025 - Mars + Saturn Antardasha - TOUGHEST: Mars-Saturn is Shatru Dasha. Saturn is 7th and 8th lord with Mars in 3rd. This period demands 10x marketing. You sent 10 proposals, needed 100. This was 18 months grinding.

Now Oct 2026 - Mars + Mercury Antardasha: Mercury is 3rd lord marketing + 12th foreign, in Leo. Mercury inside Mars is perfect for Ekalavya Consulting launch. Mercury = consulting, Mars = courage to charge high fees.

Future: Dec 2026 - Jan 2027 First client - Jupiter transits Gemini 12th house activating foreign/MNC clients via Mercury. Feb-Mar 2027 Stability - Saturn aspects 11th gains, 3 retainers 3-4 lakhs. Apr-Jun 2027 Massive profit - Mars-Ketu Antardasha + Rahu in 10th fame, big brand client equals 5 small clients.

Remedy: Daily Hanuman Chalisa for Mars, Tuesday red daal daan, daily workout for Mars in 3rd, Surya Arghya for Sun.

Your 2020-2026 hiccups were Mars-Saturn and Mars-Rahu Antardasha + Saturn transit 8th. Not talent issue.`;
    }
    return `CORRECTED Reading for Ekalavya - Mars Mahadasha:

You are in MARS Mahadasha (7 years) - Yogakaraka 5th + 10th lord. Mars in Virgo 3rd with Saturn = Sangharsha Yoga. Delay till Oct 2026 was Mars-Saturn Antardasha which needs 10x outreach.

Now Mars-Mercury Antardasha Aug 2025-Aug 2027 is launch window for consulting.

Dec 15 2026-Jan 30 2027: First client via warm referral, Jupiter Gemini 12th foreign.
Feb-Mar 2027: Stability 3 retainers 3-4 lakhs, Saturn aspect 11th.
Apr-Jun 2027: Massive profit, Mars-Ketu + Rahu 10th, big brand client.

Remedy: Hanuman Chalisa, Tuesday daan, daily workout, Surya Arghya.`;
  }

  const finalAnswer = getReading();

  if(!apiKey){
    return res.status(200).json({ answer: finalAnswer });
  }

  try{
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: `BHUVANA astrologer. Birth 23 July 1982 6:21 AM - MARS Mahadasha correct. Mars Yogakaraka 5th+10th lord Virgo 3rd with Saturn Sangharsha Yoga. Mercury Antardasha now. Explain COVID 2020-2026 hiccups due to Mars-Rahu and Mars-Saturn Antardasha + Saturn transit 6th,7th,8th. 350 words storytelling NO tables NO | English. Context ${chartContext} Q: ${question}` },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 1200
      })
    });
    const d = await r.json();
    if(r.ok && d.choices?.[0]?.message?.content?.length > 100){
      return res.status(200).json({ answer: d.choices[0].message.content.replace(/\|/g,' ') });
    }
    return res.status(200).json({ answer: finalAnswer });
  }catch(e){
    return res.status(200).json({ answer: finalAnswer });
  }
}
