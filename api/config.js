module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  if (!url || !key) {
    return res.status(500).json({ error: "Supabase configuration is missing" });
  }

  try {
    new URL(url);
  } catch {
    return res.status(500).json({ error: "Invalid Supabase URL" });
  }

  return res.status(200).json({ url, key });
};
