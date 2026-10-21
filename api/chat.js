export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});

  const { question, chartContext } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ 
      answer: `Prashna: "${question}"

Leo Lagna, Sun own house = King. Mercury Leo = Money via brand. Saturn exalted 3rd = Own firm correct but 6 months mehnat. First money 45-75 days, big profit Diwali 2025 Nov when Jupiter aspects 11th. Partnership (Jupiter 7th) will bring clients. Remedy: Surya arghya daily + Saturday mustard oil diya.`,
      source: "no-key" 
    });
  }

  try {
    const systemPrompt = `You are BHUVANA - Elite Vedic Astrologer. Chart: ${chartContext}. Leo Lagna. Sun own house, Mercury Leo, Venus Leo, Jupiter Libra Vishakha, Saturn Libra Vishakha EXALTED 3rd, Mars Gemini, Rahu Aquarius, Ketu Leo. User question: "${question}". Answer specific: For Ekalavya Consulting money, give 2nd/11th/3rd/7th house analysis, exact months timeline like Sep-Oct 2025 stable, Nov 2025 big project, 2 remedies + 1 business action. Hindi-English mix, confident, 170 words max.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 700
      })
    });

    const data = await groqRes.json();
    if (!groqRes.ok) throw new Error(JSON.stringify(data));

    const answer = data.choices?.[0]?.message?.content || "No answer";
    return res.status(200).json({ answer, source: "groq-gpt-oss-20b-live" });

  } catch (e) {
    return res.status(200).json({ 
      answer: `Groq Error Fixed Next: ${e.message}

Your Ekalavya Consulting chart: Leo Lagna = You are leader, consulting suits. 2nd + 11th lord Mercury in Leo with Venus = Money from personal brand, speaking, consulting. 3rd house exalted Saturn = Own firm success but Saturn says 180 days of consistent content/effort. 7th Jupiter Libra = Clients via partnerships/referrals. Timeline: Next 30-45 days first paid client, Sep-Oct stable retainers, Nov-Dec big profit after Jupiter moves. Action: Daily 3 posts LinkedIn + weekly webinar. Remedy: Surya arghya + Shani oil diya Saturday.`, 
      source: "error" 
    });
  }
}
