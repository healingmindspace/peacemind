import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "jzhang@healingmindspace.com";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken, email, subject, message, reply } = body;
  if (!accessToken || !email || !reply) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Verify admin
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Peacemind <noreply@peacemind.app>",
        to: email,
        subject: `Re: ${subject || "Your feedback"} — Peacemind`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3d3155; font-size: 16px; margin-bottom: 16px;">Thanks for your feedback</h2>
            <div style="background: #f5f0fa; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <p style="color: #5a4a7a; font-size: 13px; margin: 0 0 8px 0; font-style: italic;">Your message:</p>
              <p style="color: #3d3155; font-size: 14px; margin: 0;">${String(message || "").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>
            </div>
            <div style="border-left: 3px solid #c4b5e0; padding-left: 12px; margin-bottom: 16px;">
              <p style="color: #5a4a7a; font-size: 13px; margin: 0 0 8px 0;">Our reply:</p>
              <p style="color: #3d3155; font-size: 14px; margin: 0;">${String(reply).replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>
            </div>
            <p style="color: #b0a3c4; font-size: 12px;">— The Peacemind Team</p>
            <p style="color: #b0a3c4; font-size: 11px;"><a href="https://heal.peacemind.app" style="color: #7c6a9e;">heal.peacemind.app</a></p>
          </div>
        `,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
