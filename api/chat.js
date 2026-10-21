export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});

  const { question, chartContext } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  // Detailed fallback if key missing
  if (!apiKey) {
    return res.status(200).json({ 
      answer: `Prashna: "${question}"

Your Chart: Leo Lagna, Sun own house = King + Leader. 2nd house money lord Mercury in Leo with Venus = money from brand, personal influence.
3rd house exalted Saturn in Libra Vishakha = Own firm is correct, but Shani demands 6 months mehnat. 11th lord Mercury = Gains after network building.
Timeline: Sun mahadasha? For new firm, first serious money inflow: 45-75 days from now (Mars supports 10th). Big profit: Around Diwali 2025 (Nov) when Jupiter aspects 11th.
7th house Jupiter = Partnership will bring clients.
Upay: 1) Daily Surya arghya with copper lota at sunrise (Leo Lagna must). 2) Saturday mustard oil diya to Shani under Peepal. 3) Rahu in 6th Aquarius = Donate blue blanket to worker.

[NOTE: Add GROQ_API_KEY in Vercel to get live AI]`,
      source: "fallback-no-key" 
    });
  }

  try {
    const systemPrompt = `You are BHUVANA - Elite Vedic Astrologer. Your chart context: ${chartContext}

Birth Details: Leo Lagna. Sun in own house, Mercury Leo Purva Phalguni, Venus Leo, Jupiter Libra Vishakha, Saturn Libra Vishakha EXALTED in 3rd, Mars Gemini, Moon details hidden, Rahu Aquarius, Ketu Leo.

TASK: User asks: "${question}"

You MUST answer:
- Do NOT be vague. Give specific months, specific houses (2nd wealth, 11th gains, 3rd effort, 10th karma, 7th partnership)
- For money from new firm: Explain 2nd lord, 11th lord, 3rd exalted Saturn = delayed but permanent, Jupiter in 7th = client growth. Give timeline like "Sep-Oct 2025 first stable income, Nov 2025 big project"
- Give 2 remedies: One Lal Kitab, One Mantra. One business action.
- Tone: Hindi-English mix, like real Pandit from Varanasi, confident.
- Limit: 170 words max. No disclaimers.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 700
      })
    });

    const data = await groqRes.json();
    
    if (!groqRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    const answer = data.choices?.[0]?.message?.content || "No answer from AI";
    return res.status(200).json({ answer, source: "groq-live" });

  } catch (e) {
    return res.status(200).json({ 
      answer: `Temporary Groq issue: ${e.message}

But your chart says: Leo Lagna Sun own house = Leadership confirmed. New firm money = 2nd + 11th lord Mercury in Leo = Your personal brand will bring money. 3rd exalted Saturn = You must do daily self-effort for 6 months, then empire.

First income: Within 60 days. Stable profit: Nov 2025 after Jupiter transit to your 11th from Moon. Focus on partnerships (Jupiter in 7th).

Remedy: Surya arghya daily + Shani oil diya Saturday.`, 
      source: "error-fallback" 
    });
  }
}
