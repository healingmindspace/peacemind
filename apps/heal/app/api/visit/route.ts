import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Known bot/cloud IP prefixes
const BOT_IP_PREFIXES = [
  "18.", "13.", "52.", "54.",     // AWS
  "34.", "35.",                    // Google Cloud
  "20.", "40.", "52.", "104.",     // Azure
  "24.199.", "137.184.", "147.182.", "64.23.", "159.89.", "167.172.", "165.227.", // DigitalOcean
  "45.33.", "172.104.",           // Linode
  "141.95.", "51.178.",           // OVH
];

// Known bot user-agent patterns
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /curl/i, /wget/i,
  /python/i, /go-http/i, /java\//i, /node-fetch/i, /axios/i,
  /headless/i, /phantom/i, /scrapy/i, /httpclient/i,
  /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /discordbot/i,
  /googlebot/i, /bingbot/i, /yandex/i, /baidu/i,
  /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i,
  /uptimerobot/i, /pingdom/i, /statuscake/i,
];

function isBot(ip: string, ua: string): boolean {
  if (BOT_IP_PREFIXES.some((prefix) => ip.startsWith(prefix))) return true;
  if (BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))) return true;
  if (!ua || ua.length < 20) return true; // No/short UA = likely bot
  return false;
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // Count unique visitors today
  const { count: visitors } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("date", today);

  // Count today's activities (anonymous aggregate)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const since = todayStart.toISOString();

  const [moods, breathing, journals] = await Promise.all([
    supabase.from("moods").select("*", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("breathing_sessions").select("*", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("journals").select("*", { count: "exact", head: true }).gte("created_at", since),
  ]);

  const totalActions = (moods.count || 0) + (breathing.count || 0) + (journals.count || 0);

  return NextResponse.json({
    visitors: visitors || 0,
    actions: totalActions,
  });
}

export async function POST(request: Request) {
  // Use Cloudflare's real client IP header first
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const ua = request.headers.get("user-agent") || "";
  const today = new Date().toISOString().split("T")[0];

  // Skip bots
  if (isBot(ip, ua)) {
    return NextResponse.json({ ok: true });
  }

  // Check if this IP already visited today
  const { data: existing } = await supabase
    .from("visits")
    .select("id, count")
    .eq("ip", ip)
    .eq("date", today)
    .limit(1);

  if (existing && existing.length > 0) {
    // Increment count
    await supabase
      .from("visits")
      .update({ count: (existing[0].count || 1) + 1 })
      .eq("id", existing[0].id);
  } else {
    // Detect device type from UA
    const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
    const device = isMobile ? "mobile" : "desktop";

    // Geo lookup for new visitors (ipinfo.io free tier: 50k/month)
    let country: string | null = null;
    let region: string | null = null;

    // Try Cloudflare header first (free)
    country = request.headers.get("cf-ipcountry") || null;

    // If no Cloudflare header, use ipinfo.io
    if (!country && ip !== "unknown") {
      try {
        const geo = await fetch(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN || ""}`);
        if (geo.ok) {
          const data = await geo.json();
          country = data.country || null;
          region = data.region || null;
        }
      } catch { /* skip geo on failure */ }
    }

    await supabase.from("visits").insert({
      ip,
      user_agent: ua.slice(0, 500),
      date: today,
      count: 1,
      device,
      country,
      region,
    });
  }

  return NextResponse.json({ ok: true });
}
