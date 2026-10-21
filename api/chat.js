export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});
  const { question, chartContext } = req.body;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ answer: `Your Leo Lagna: 2nd lord Mercury in Leo = money via brand. 3rd exalted Saturn = 6 months effort. First income 45-75 days, big profit Nov 2025. Remedy: Surya arghya daily. Add GROQ_API_KEY in Vercel.` });
  }
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: `You are BHUVANA elite astrologer. Chart: ${chartContext}. Give specific months, houses 2/11/3/7, 2 remedies. Question: ${question}. 170 words max Hindi-English mix.` },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 700
      })
    });
    const data = await groqRes.json();
    if (!groqRes.ok) throw new Error(JSON.stringify(data));
    return res.status(200).json({ answer: data.choices[0].message.content });
  } catch (e) {
    return res.status(200).json({ answer: `Error ${e.message} but chart says: Mercury Leo = brand money. Saturn exalted = delay then permanent. Timeline 60 days first client, Nov big profit. Surya arghya + Shani diya.` });
  }
}
