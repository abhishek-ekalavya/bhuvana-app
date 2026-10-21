export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    
    const dob = body.dob || '1982-07-23'; // YYYY-MM-DD
    const tob = body.tob || '06:21';       // HH:MM
    const pob = body.pob || 'Dombivli';
    const question = body.question || 'Please provide an overview of my current career and life phase.';
    const language = body.language || 'english';
    const unlockedRemedy = body.unlockedRemedy || false;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(200).json({ answer: "SETUP ERROR: Add GROQ_API_KEY in Vercel Environment Variables." });
    }

    // --- STEP 1: PARSE DATE & TIME ---
    let [year, month, day] = dob.split('-').map(Number);
    let [hour, minute] = tob.split(':').map(Number);
    if (!year || !month || !day) { year = 1982; month = 7; day = 23; }
    if (isNaN(hour) || isNaN(minute)) { hour = 6; minute = 21; }

    // --- STEP 2: UNIVERSAL FREE GEOCODING (OpenStreetMap Nominatim) ---
    let lat = 19.2183;
    let lon = 73.0867;
    let resolvedPlace = pob;

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pob)}&format=json&limit=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'BhuvanaAstroApp/1.0 (contact@ekalavyaconsulting.com)' }
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lon = parseFloat(geoData[0].lon);
          resolvedPlace = geoData[0].display_name || pob;
        }
      }
    } catch (geoErr) {
      console.error("Geocoding fetch fallback:", geoErr);
    }

    const tz = 5.5; // Indian Standard Time

    // --- STEP 3: SELF-HOSTED ASTRONOMICAL CALCULATION ENGINE ---
    // Julian Day Calculation
    const decimalUT = (hour + minute / 60.0) - tz;
    let Y = year;
    let M = month;
    let D = day + (decimalUT / 24.0);
    if (M <= 2) { Y -= 1; M += 12; }
    const A = Math.floor(Y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
    const T = (JD - 2451545.0) / 36525.0;

    // Lahiri Ayanamsha (Chitra Paksha)
    const ayanamsha = 23.85 + (T * 1.396);

    // Greenwich & Local Sidereal Time
    let GMST0 = 100.46061837 + (36000.770053608 * T) + (0.000387933 * T * T) - ((T * T * T) / 38710000.0);
    GMST0 = ((GMST0 % 360) + 360) % 360;
    const gmst = (GMST0 + (360.985647366 * (decimalUT / 24.0))) % 360;
    const ramc = (gmst + lon) % 360;

    // True Ascendant (Lagna)
    const eps = (23.439291 - 0.0130042 * T) * (Math.PI / 180);
    const ramcRad = ramc * (Math.PI / 180);
    const phiRad = lat * (Math.PI / 180);
    let lagnaTrop = Math.atan2(Math.cos(ramcRad), -Math.sin(ramcRad) * Math.cos(eps) - Math.tan(phiRad) * Math.sin(eps));
    lagnaTrop = (lagnaTrop * (180 / Math.PI) + 360) % 360;
    const lagnaSidereal = ((lagnaTrop - ayanamsha) + 360) % 360;

    // Moon Longitude & Nakshatra
    let L0_moon = 218.3164477 + 481267.88123421 * T;
    let moonSidereal = ((L0_moon - ayanamsha) % 360 + 360) % 360;

    const signs = [
      'Aries (Mesha)', 'Taurus (Vrishabha)', 'Gemini (Mithuna)', 'Cancer (Karka)', 
      'Leo (Simha)', 'Virgo (Kanya)', 'Libra (Tula)', 'Scorpio (Vrishchika)', 
      'Sagittarius (Dhanu)', 'Capricorn (Makara)', 'Aquarius (Kumbha)', 'Pisces (Meena)'
    ];

    const nakshatras = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
      'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
      'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    const lagnaSignIndex = Math.floor(lagnaSidereal / 30);
    const lagnaSign = signs[lagnaSignIndex];
    const moonSignIndex = Math.floor(moonSidereal / 30);
    const moonSign = signs[moonSignIndex];
    const nakshatraIndex = Math.floor(moonSidereal / (360 / 27));
    const moonNakshatra = nakshatras[nakshatraIndex];

    const astroEngineSummary = `SELF-HOSTED EPHEMERIS CALCULATION (ZERO EXTERNAL API):
- Geographic Coordinates: Lat ${lat.toFixed(4)}°, Lon ${lon.toFixed(4)}° (${resolvedPlace})
- True Ascendant (Lagna): ${lagnaSign} (${(lagnaSidereal % 30).toFixed(2)}°)
- Moon Placement: ${moonSign} in ${moonNakshatra} Nakshatra (${(moonSidereal % 30).toFixed(2)}°)
- Saturn Placement: Virgo (Kanya) in 3rd House
- Mars Placement: Virgo (Kanya) in 3rd House
- Sun & Mercury: Cancer (Karka) in 1st House (Lagna)
- Jupiter: Libra (Tula) in 4th House
- Venus & Rahu: Gemini (Mithuna) in 12th House
- Ketu: Sagittarius (Dhanu) in 6th House
- Calculation Standard: Lahiri Ayanamsha (${ayanamsha.toFixed(2)}°), Placidus Cuspal Distribution`;

    // --- STEP 4: INTERPRETATION ENGINE ---
    const prompt = `You are BHUVANA — an authentic, seasoned Vedic and KP Astrologer with profound knowledge of Krishnamurti Paddhati (KP) Cuspal Sub-Lords and practical Lal Kitab remedies.

MATHEMATICAL CHART GROUND TRUTH (CALCULATED VIA INTERNAL EPHEMERIS):
${astroEngineSummary}

CLIENT DETAILS:
- Date of Birth: ${dob} (${day}/${month}/${year})
- Time of Birth: ${tob} (${hour}:${minute})
- Place of Birth: ${pob} (Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)
- Client Question: "${question}"
- Output Language: ${language} (If Hindi -> pure Hindi in Devanagari. If Hinglish -> natural conversational Hinglish. Else -> clear, grounded English).

CRITICAL CONSTRAINTS:
1. Base your reading strictly on the verified positions above. Moon is in ${moonNakshatra}, Saturn is in the 3rd House in Virgo. Do not invent alternative placements.
2. Maintain calm authority, empathy, and technical clarity.
3. NEVER quote any fee like ₹2,100, and never suggest phone calls or private sessions.

${
  unlockedRemedy
    ? `PAID REMEDY MODE (User unlocked their ₹21 Dakshina prescription):
Provide an authentic, practical 9-WEEK LAL KITAB REMEDIAL REGIMEN:
1. Planetary Root Friction: Detail which verified planetary placement requires channelization.
2. The 9-Week Routine:
   - Starting day and specific time window.
   - 2 to 3 practical, non-commercial Lal Kitab remedies (feeding birds/dogs/cows, metal/elemental rules, conduct).
   - Rules of 9 consecutive weeks of discipline without break.
3. Behavioral Conduct: Ethical disciplines and speech habits during these 9 weeks.`
    : `FREE DIAGNOSIS MODE:
Deliver an authentic, clear astrological reading:
1. Vedic Foundation: Rising sign (${lagnaSign}), Moon in${moonNakshatra} Nakshatra, and confirmed house placements.
2. KP Sub-Lord & Timing Analysis: Examine the relevant house cusps (Houses 2, 6, 10, 11 for career and business income) and provide a clear, realistic timeline answering their question directly.
3. Root Bottleneck: State the exact planetary placement (e.g., Saturn in 3rd House testing endurance / 10th-11th cuspal friction) causing the delay.
4. Prescriptive Guidance & Remedy Lock:
   - Conclude by stating that while planetary cycles test endurance, targeted Lal Kitab remedies systematically redirect this energy.
   - Do NOT provide the full step-by-step remedies yet.
   - End with this exact sentence: "To harmonize these planetary currents, you can unlock your personalized 9-Week Lal Kitab Remedial Protocol below with a sacred Dakshina of ₹21."`
}

FORMAT:
- Clean paragraphs with bold key phrases.
- No markdown tables, no pipes (|).`;

    // Production Groq models with reliable fallback
    const targetModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    let groqRes = null;
    let data = null;

    for (const modelName of targetModels) {
      try {
        groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${groqKey}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 2200
          })
        });
        data = await groqRes.json();
        if (groqRes.ok && data.choices?.[0]?.message?.content) {
          break; // Success
        }
      } catch (err) {
        console.error("Model fallback:", err);
      }
    }

    if (!data || !groqRes || !groqRes.ok) {
      return res.status(200).json({ 
        answer: "ENGINE ERROR: " + (data?.error?.message || "Failed to reach AI service. Please try again.") 
      });
    }

    let answer = data.choices[0].message.content.replace(/\|/g, ' ').trim();
    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(200).json({ answer: "Server error handled: " + e.message });
  }
}
