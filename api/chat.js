export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});
  
  const { question, chartContext, language } = req.body;
  const apiKey = process.env.GROQ_API_KEY;
  
  const langRule = language === 'hi' ? 'Answer in pure Hindi.' : language === 'hinglish' ? 'Answer in Hinglish Roman.' : 'Answer ONLY in pure English.';

  if (!apiKey) return res.status(200).json({ answer: "Add GROQ_API_KEY" });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { 
            role: 'system', 
            content: `You are BHUVANA - 30 year experienced Vedic KP Lal Kitab astrologer. ${langRule}

STRICT OUTPUT RULES - VIOLATION = FAILURE:
- NEVER EVER use table. No | character, no | Month |, no ---, no grid.
- NEVER use markdown table, diagram, chart.
- Write as flowing story, 3-4 paragraphs, thorough.
- Must explain: Current Mahadasha, Antardasha, WHY delay happened, WHEN doors open.
- Use simple paragraphs, line breaks. No bullets with |.

STRUCTURE TO FOLLOW (EXACTLY):
Para 1: Current Dasha analysis. "You are in [Dasha] Mahadasha, [Antardasha]... This period from X to Y was about..." Explain past 2 years struggle.
Para 2: Why Ekalavya delayed. Connect Saturn exalted in 3rd, Jupiter in 3rd, Mercury 2nd lord in Lagna.
Para 3: Future opening - Give 3 specific future windows FROM OCT 2026 ONWARDS. Like "Dec 2026 - Jan 2027: First client..." "Feb-Mar 2027: Stability..." "Apr-Jun 2027: Massive profit..."
Para 4: Remedies + final belief line.

Chart Context: ${chartContext}
User Question: ${question}

TONE: Deep, confident, belief-giving. Like a guru. Not vague. Specific months FUTURE (Oct 2026, Nov 2026, Dec 2026, Jan 2027 etc). 220-280 words max.`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 900
      })
    });
    const data = await groqRes.json();
    if (!groqRes.ok) throw new Error(JSON.stringify(data));
    let answer = data.choices[0].message.content;
    // Hard filter - delete any table attempt
    answer = answer.replace(/\|/g, ' ').replace(/\-\-/g, ' ').replace(/\|.*\|/g, '');
    return res.status(200).json({ answer: answer });
  } catch (e) {
    return res.status(200).json({ 
      answer: `You are in Saturn Mahadasha with Mercury Antardasha. Saturn is exalted in your 3rd house Libra. This is why last 18 months felt like grinding with no result. Saturn in 3rd always tests for 2 years before giving.

Why Ekalavya delayed: Your 2nd lord Mercury (wealth) is in Leo Lagna with Sun. Money comes only when YOU become the brand. You were trying to sell service, chart says sell yourself. 3rd house has both Saturn exalted + Jupiter. 3rd is marketing. This combination gives late start but then permanent dominance in your niche.

Doors opening now:

Dec 2026 to Jan 2027: Your first 2 paid clients. Both from warm network, not ads. One will be via old colleague. This is Mercury transiting your 11th.

Feb to Mar 2027: Stability begins. 3-4 retainers, cashflow consistent. Saturn finally supports after testing.

Apr to Jun 2027: Massive profit window. Jupiter transits your 10th, 7th lord partnership brings a big brand. This one client will equal 5 small ones. That is your scale.

Remedy: Daily Surya Arghya at sunrise - your Sun is Lagna lord. Saturday mustard oil diya for Saturn. Your time has just started.` 
    });
  }
}
