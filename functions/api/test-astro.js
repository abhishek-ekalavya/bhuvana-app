export async function onRequest(context) {
  const { env } = context;
  const vedicKey = env.VEDIC_ASTRO_KEY;

  if (!vedicKey) {
    return new Response(JSON.stringify({
      status: "FAILED",
      error: "VEDIC_ASTRO_KEY is missing from Cloudflare Settings -> Variables and secrets."
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Testing with your exact birth details: 23/07/1982 at 06:21 in Dombivli (lat: 19.2183, lon: 73.0867, tz: 5.5)
  const dob = "23/07/1982";
  const tob = "06:21";
  const lat = "19.2183";
  const lon = "73.0867";
  const tz = "5.5";

  const url = `https://api.vedicastroapi.com/v3-json/horoscope/planet-details?api_key=${vedicKey}&dob=${dob}&tob=${tob}&lat=${lat}&lon=${lon}&tz=${tz}&lang=en`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return new Response(JSON.stringify({
      status: "SUCCESS",
      httpCode: res.status,
      apiKeyDetected: vedicKey.slice(0, 4) + "..." + vedicKey.slice(-4),
      rawResponseFromVedicAstroAPI: data
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      status: "FETCH_ERROR",
      message: err.message
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
