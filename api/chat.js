export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { question, language } = req.body || {};
  const apiKey = process.env.GROQ_API_KEY;
  const langRule = language === 'hi' ? 'Pure Hindi' : language === 'hinglish' ? 'Hinglish Roman' : 'Pure English only';

  // ELABORATED STORYTELLING FALLBACK - This is what you asked for, works even if API fails
  const elaboratedFallback = `Detailed Reading for Ekalavya Consulting - When Money Will Come:

You are currently running Saturn Mahadasha with Mercury Antardasha. Saturn is your 6th and 7th lord, and it is EXALTED in your 3rd house Libra. Saturn in 3rd house is very powerful for marketing, but its nature is delay. In Vedic astrology, Saturn tests you for 18 to 24 months in 3rd house before giving results. That is why from early 2024 to Oct 2026 you felt grinding, proposals sent but no closure, network not converting. This was not failure, this was Saturn's testing phase.

Mercury is your 2nd lord of wealth and 11th lord of gains, placed in Leo Lagna with Sun and Venus. 2nd lord in Lagna is called Dhana Yoga. It means your wealth comes from your own personality, your speech, your personal brand. You were trying to sell Ekalavya as an agency service. Your chart says people will pay for YOU as a consultant, not for a faceless agency. This small shift changes everything.

Jupiter, your 5th lord of intelligence and 8th lord of research, is also in Libra 3rd house with Saturn. 5th lord in 3rd means your intelligence must be shown through content, writing, marketing frameworks. That is why consulting is your correct dharma.

Now transits from Oct 2026 onwards:

At present Jupiter is transiting Taurus, aspecting your 3rd house and 7th house of business partnerships. From December 2026, Jupiter will transit to Gemini, which is your 11th house of massive gains where Mars is already sitting. When Jupiter transits 11th, it activates Mars and gives network profit. This is your first client window: Dec 15, 2026 to Jan 30, 2027. The client will come from a warm contact, not cold outreach, likely an ex-colleague or referral.

Second window: February to March 2027. Saturn will transit Pisces and aspect your 11th house. Saturn aspect on 11th after being exalted in 3rd gives stability. You will move from 1 client to 3 retainers. Income becomes stable at 3 to 4 lakhs per month. This is when Ekalavya stops being a struggle.

Third and biggest window: April to June 2027. Jupiter remains in Gemini 11th and Rahu transits your 10th house of career. Rahu in 10th gives sudden fame. A 7th house partnership will bring a large brand client. This client alone will equal 5 small clients. This is your massive profit phase.

Remedies to speed up: 1. Surya Arghya daily at sunrise with water and red flower, because Sun is your Lagna lord Leo and it is weak without remedy. 2. Saturday evening mustard oil diya under Peepal tree for Saturn. 3. Speak on LinkedIn daily, Saturn in 3rd demands consistent communication.

Your delay was astrological, not capability. Doors are opening now.`;

  if(!apiKey){
    return res.status(200).json({ answer: elaboratedFallback });
  }

  try{
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: `You are BHUVANA - 30 years experienced Vedic astrologer. Language: ${langRule}. 
You MUST give elaborated storytelling reading like this example structure. NEVER give short lines or tables. NEVER use | character.

STRUCTURE MANDATORY (4 paragraphs, 280-350 words):
Para 1: Start with Mahadasha/Antardasha. "You are running Saturn Mahadasha with Mercury Antardasha. Saturn is exalted in 3rd Libra..." Explain WHY last 18 months was delay due to Saturn testing.
Para 2: Explain 2nd lord Mercury in Lagna, Jupiter in 3rd, Mars in 11th. Why Ekalavya is correct but approach was wrong.
Para 3: Give 3 future transit windows FROM OCT 2026. Must mention Jupiter transit to Gemini 11th house, Saturn aspect, Rahu transit. Specific dates: Dec 2026-Jan 2027 first client, Feb-Mar 2027 stability, Apr-Jun 2027 massive profit.
Para 4: Remedies and final belief-giving line.

Chart: Leo Lagna, Sun Leo Own, Mercury Leo, Venus Leo, Saturn EXALTED Libra H3, Jupiter Libra H3, Mars Gemini H11.
Today date: Oct 2026.
NO tables. NO | . Storytelling only. 300 words.`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 1200
      })
    });
    const data = await groqRes.json();
    if(groqRes.ok && data.choices && data.choices[0] && data.choices[0].message.content.length > 100){
      let ans = data.choices[0].message.content.replace(/\|/g, ' ');
      return res.status(200).json({ answer: ans });
    } else {
      return res.status(200).json({ answer: elaboratedFallback });
    }
  }catch(e){
    return res.status(200).json({ answer: elaboratedFallback });
  }
}
