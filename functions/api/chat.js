export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const dob = body.dob || '1982-07-23';
    const tob = body.tob || '06:21';
    const pob = body.pob || 'Dombivli';
    const question = body.question || 'Please provide an overview of my current career and life phase.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;
    const cachedAstroContext = body.cachedAstroContext || null;

    const groqKey = env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(
        JSON.stringify({ answer: "SETUP ERROR: GROQ_API_KEY is not configured in Cloudflare Pages." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let day = '23', month = '07', year = '1982';
    if (dob && dob.includes('-')) {
      const parts = dob.split('-');
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    }
    const formattedDate = `${day}/${month}/${year}`;

    let formattedTime = '06:21';
    if (tob && tob.includes(':')) {
      const tparts = tob.split(':');
      formattedTime = `${tparts[0].padStart(2, '0')}:${tparts[1].padStart(2, '0')}`;
    }

    const astroContext = cachedAstroContext || 
      `ASTRONOMICAL DATA: Ascendant (Lagna) in Cancer (Karka); Moon in Leo (Simha) in Magha Nakshatra; Sun & Mercury in Cancer (1st House); Saturn & Mars in Virgo (3rd House); Jupiter in Libra (4th House); Venus & Rahu in Gemini (12th House); Ketu in Sagittarius (6th House).`;

    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and practical Lal Kitab remedies.

VERIFIED ASTRONOMICAL GROUND TRUTH:
${astroContext}

CLIENT DETAILS:
- Date of Birth: ${dob} (${formattedDate})
- Time of Birth: ${tob} (${formattedTime})
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language}

STRICT CONSTRAINTS:
1. Speak with calm, definitive authority.
2. Do not include meta-disclaimers like "consult an astrologer" or "not a substitute for professional advice".
3. Never quote consultation fees or offer private sessions.

${
  unlockedRemedy
    ? `PAID REMEDY MODE:
Provide the 9-WEEK LAL KITAB REMEDY PROTOCOL:
1. Identify the root planetary friction.
2. Detail the exact weekly schedule with 2-3 specific non-commercial remedies.
3. Outline behavioral guidelines during this period.`
    : `FREE DIAGNOSIS MODE:
1. Outline the Vedic chart foundations for this question.
2. Provide timing and KP analysis directly answering their query.
3. Identify the planetary bottleneck.
4. Conclude with this exact sentence:
"To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases. No markdown tables.`;

    const groqPayload = {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 800
    };

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(groqPayload)
    });

    const groqData = await groqResponse.json();

    if (!groqResponse.ok || !groqData || !groqData.choices) {
      return new Response(
        JSON.stringify({
          answer: "ENGINE NOTICE: " + (groqData && groqData.error ? groqData.error.message : "Service busy. Please try again.")
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let answer = groqData.choices[0].message.content.trim();
    
    // Clean disclaimers
    answer = answer.replace(/Remember,?\s*these remedies are tailored.*?(?=\n|$)/gi, '');
    answer = answer.replace(/Seek guidance from a trusted.*?(?=\n|$)/gi, '');
    answer = answer.replace(/not a substitute for expert guidance.*?(?=\n|$)/gi, '');
    answer = answer.replace(/consult a qualified.*?astrologer.*?(?=\n|$)/gi, '');
    answer = answer.replace(/consult with an expert.*?(?=\n|$)/gi, '');
    answer = answer.replace(/Please consult.*?(?=\n|$)/gi, '').trim();

    return new Response(
      JSON.stringify({
        answer: answer,
        astroContext: astroContext
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        answer: "Server error handled: " + err.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}
