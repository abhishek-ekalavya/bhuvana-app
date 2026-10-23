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

    const name = (body.name || '').trim();
    const gender = body.gender || 'Not specified';
    const dob = body.dob || '';
    const tob = body.tob || '';
    const pob = body.pob || '';
    const question = body.question || 'Please provide an overview of my current planetary phase and guidance.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;

    const groqKey = env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(
        JSON.stringify({ answer: "CONFIG ERROR: GROQ_API_KEY environment variable is missing in Cloudflare." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const clientSalutation = name ? `Dear ${name}` : 'Namaste';

    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound mastery of Krishnamurti Paddhati (KP) Cuspal Sub-Lords, Vimshottari Dasha, and classical Lal Kitab remedies.

CLIENT DETAILS:
- Full Name: ${name || 'Seeker'}
- Gender: ${gender}
- Date of Birth: ${dob}
- Time of Birth: ${tob}
- Place of Birth: ${pob}
- Client Question: "${question}"
- Output Language: ${language}

ASTRONOMICAL TASK:
Calculate the Vedic Ascendant (Lagna), Moon sign (Rashi), Nakshatra, and current Vimshottari Mahadasha/Antardasha based on the exact Date of Birth (${dob}), Time of Birth (${tob}), and Place (${pob}) provided. Ground all interpretations specifically in this calculated chart.

STRICT CONSTRAINTS:
1. Always open your reading addressing the client personally and respectfully by their name (e.g., "${clientSalutation}, ...").
2. Speak with calm, definitive authority, tailoring insights to their unique birth details and question.
3. Do not include meta-disclaimers like "consult an astrologer" or "not a substitute for professional advice".
4. Never quote consultation fees or offer private sessions.

${
  unlockedRemedy
    ? `PAID REMEDY MODE:
Provide the 9-WEEK LAL KITAB REMEDY PROTOCOL for ${name || 'the seeker'}:
1. Identify the root planetary friction causing obstacles in their query.
2. Detail an exact 9-week schedule with 2-3 specific non-commercial remedies.
3. Outline behavioral guidelines during this period.
Ensure the entire 9-week protocol is fully written out to completion.`
    : `FREE DIAGNOSIS MODE:
1. Address ${name || 'the seeker'} directly and outline their core Vedic chart foundations (Lagna, Moon Sign, Key Planets).
2. Provide timing and KP analysis directly answering their query.
3. Identify the planetary bottleneck holding them back.
4. Conclude with this exact sentence:
"To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases. No markdown tables.`;

    const groqPayload = {
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 2500
    };

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const groqResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(groqPayload)
    });

    const responseText = await groqResponse.text();
    let groqData;
    try {
      groqData = JSON.parse(responseText);
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ answer: "RAW GROQ ERROR (" + groqResponse.status + "): " + responseText.slice(0, 300) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!groqResponse.ok || !groqData || !groqData.choices || !groqData.choices.length) {
      const errDetail = groqData && groqData.error ? (groqData.error.message || JSON.stringify(groqData.error)) : responseText.slice(0, 300);
      return new Response(
        JSON.stringify({ answer: "GROQ API REJECTED (" + groqResponse.status + "): " + errDetail }),
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
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        answer: "CLOUDFLARE FUNCTION EXCEPTION: " + err.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}
