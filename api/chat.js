export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  const { question, chart } = req.body || {};
  
  const prompt = `You are BHUVANA, expert Vedic KP Lal Kitab astrologer. Chart: Leo Lagna, Sun Leo 1st Magha-Ketu, Moon Cancer Ashlesha, Mars Gemini, Mercury Leo, Jupiter Libra, Saturn Libra exalted 3rd. Answer question "${question}" with chart reference, KP sub-lord, one Lal Kitab remedy, warm Hinglish, max 5 lines. Chart: ${chart}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${process.env.GROQ_API_KEY}`},
      body: JSON.stringify({
        model:'llama-3.1-8b-instant',
        messages:[{role:'system',content:prompt},{role:'user',content:question||'career'}],
        temperature:0.7,
        max_tokens:350
      })
    });
    const d = await r.json();
    const ans = d.choices?.[0]?.message?.content || null;
    if(ans) return res.status(200).json({answer:ans});
    throw new Error('no key');
  } catch(e) {
    let ans = "";
    const q = (question||'').toLowerCase();
    if(q.includes('career')) ans = "Career: 10th lord Venus in 4th - work from home/consulting strong. Saturn exalted 3rd aspects 10th - after July 2026 lift. Next 6 months focus teaching/consulting, avoid job change till Nov. Upay: Crows feed Saturday.";
    else if(q.includes('marriage')) ans = "Marriage: 7th lord Saturn exalted 3rd - spouse hardworking mature. Jupiter aspects 7th - late but stable. KP sub Moon Ashlesha - emotional bond matters. Timing late 2026 good.";
    else if(q.includes('saturn')||q.includes('delay')) ans = "Saturn exalted Libra 3rd - not bad! It delays to make you master. 3rd is efforts. Lal Kitab: Keep iron piece, respect elder brother, no alcohol.";
    else if(q.includes('remedy')||q.includes('lal kitab')) ans = "Lal Kitab Leo Lagna: 1) Copper coin pocket, 2) Surya jal daily 6am, 3) Don't buy iron Saturday. Sun strength needed for confidence.";
    else ans = `Prashna "${question}" - Leo Lagna Sun own house leadership. Saturn exalted 3rd mehnat se safalta. Jupiter transit 7th partnership good. Upay: Surya arghya daily. (Add GROQ_API_KEY for real AI)`;
    return res.status(200).json({answer:ans});
  }
}
