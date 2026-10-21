export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});

  const { question, chartContext } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  // If no key, return DETAILED fallback (not vague)
  if (!apiKey) {
    const q = question.toLowerCase();
    let detailed = "";
    if (q.includes('money') || q.includes('firm') || q.includes('business')) {
      detailed = `Prashna: "${question}"\n\nYour Chart: Leo Lagna (Sun own house) = Natural Leader, King energy. 2nd Lord Mercury in Leo = Money through own communication/brand. 11th Lord Mercury also = Gains from network.\n\nSaturn exalted in Libra in 3rd house Vishakha: 3rd is own effort, startup, courage. Exalted Saturn = Slow start but permanent empire. Shani says "mehnat se safalta".\n\nTimeline: Saturn Dasha/transit? You are in Saturn's hard work period. For new firm, money flow starts after Sun transits 11th (June-July) + Mars in 10th gives push. Next 3-6 months: Focus on 3rd house efforts, partnerships (7th Jupiter aspect).\n\nRemedy: Shani - Light mustard oil diya Saturday evening + Hanuman Chalisa. Surya arghya daily for Leo Lagna power. Rahu in 6th = Win over competitors by daily routine.\n\nAction: Don't expect windfall, expect steady client base building till Diwali. 2nd year = Jupiter will give expansion.`;
    } else {
      detailed = `Prashna: "${question}"\n\nLeo Lagna chart: Sun in own house = Leadership yoga. Moon nakshatra? Your mind strong. Saturn exalted 3rd = Self-made. Jupiter in Libra Vishakha = Partnership luck after effort. 10th house Taurus (Venus) = Career in luxury, beauty, finance, creative.\n\nSpecific: Ask again with "money" or "career" or "marriage" - I will give house-wise breakdown.\n\nRemedy: Surya Namaskar + Aditya Hridaya Stotram for Leo power.`;
    }
    return res.status(200).json({ answer: detailed + "\n\n[System: GROQ_API_KEY missing - add in Vercel Settings]", source: "detailed-fallback" });
  }

  // REAL GROQ CALL - with highly specific prompt
  try {
    const systemPrompt = `You are BHUVANA - India's most precise Vedic + KP + Lal Kitab astrologer. You NEVER give vague answers like "good time coming". You MUST give:

1. House analysis from given chart context: ${chartContext}
2. Dasha/Transit logic
3. Exact timeline in months
4. 1 Lal Kitab remedy + 1 Mantra
5. One actionable business/career advice

Chart is Leo Lagna. Saturn exalted 3rd Libra, Jupiter Libra, Mercury Leo, Venus Leo, Mars Gemini, Rahu Aquarius, Ketu Leo.

User language: Respond in mix Hindi-English like real pandit: "Surya apka lagna mein..."

Rules: Be specific, bold, non-vague. No disclaimer "consult astrologer". You ARE the astrologer. Give dates. If question about money from new firm, say: 2nd house, 11th house, 3rd house effort, 7th partnership, Saturn delay logic.

Keep under 180 words. Use emojis sparingly.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    const data = await groqRes.json();
    if (!groqRes.ok) throw new Error(JSON.stringify(data));

    const answer = data.choices?.[0]?.message?.content || "No answer";
    return res.status(200).json({ answer, source: "groq-llama3.3" });

  } catch (e) {
    return res.status(200).json({ answer: `Groq Error: ${e.message}. But reading your chart: Leo Lagna Sun = Leadership. For firm money, Saturn in 3rd exalted says 6 months of consistent effort = first big profit around November 2025 after Jupiter moves. Till then build system. Remedy: Shani yantra + daily Surya arghya.`, source: "error-fallback" });
  }
}
