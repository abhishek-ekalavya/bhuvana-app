export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});
  const { question, chartContext, language } = req.body;
  const apiKey = process.env.GROQ_API_KEY;
  const langInstruction = language === 'hi' ? 'Answer ONLY in pure Hindi (Devanagari).' : language === 'hinglish' ? 'Answer in Hinglish (Hindi + English mix, Roman script).' : 'Answer ONLY in pure English. No Hindi.';
  if (!apiKey) {
    return res.status(200).json({ answer: `Leo Lagna: Mercury Leo = brand income, Saturn exalted 3rd = delayed growth. First income 45-75 days.` });
  }
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: `You are BHUVANA elite astrologer. ${langInstruction} Chart: ${chartContext}. Give specific months, houses 2/11/3/7, 2 remedies. Max 200 words.` },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });
    const data = await groqRes.json();
    if (!groqRes.ok) throw new Error(JSON.stringify(data));
    return res.status(200).json({ answer: data.choices[0].message.content });
  } catch (e) {
    return res.status(200).json({ answer: `Error: ${e.message}` });
  }
}
