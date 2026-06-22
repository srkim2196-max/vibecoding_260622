module.exports = async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    ok: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-2.5-flash",
  });
};
