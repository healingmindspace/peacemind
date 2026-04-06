import { NextResponse } from "next/server";
import { getSupabase, getAuthenticatedUserId } from "@/lib/api-utils";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "healingmindspace@proton.me";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { accessToken, feedbackId, reply } = body;
  if (!accessToken || !feedbackId || !reply?.trim()) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = getSupabase(accessToken);
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Save reply
  const { error } = await supabase
    .from("feedback")
    .update({ reply: reply.trim(), replied_at: new Date().toISOString() })
    .eq("id", feedbackId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get the feedback to find user email
  const { data: fb } = await supabase
    .from("feedback")
    .select("user_email, subject, message")
    .eq("id", feedbackId)
    .single();

  // Send email if user left an email
  if (fb?.user_email && process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Peacemind <noreply@peacemind.app>",
          to: fb.user_email,
          subject: `Re: ${fb.subject || "Your feedback"} — Peacemind`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #3d3155; font-size: 16px; margin-bottom: 16px;">Thanks for your feedback</h2>
              <div style="background: #f5f0fa; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #5a4a7a; font-size: 13px; margin: 0 0 8px 0; font-style: italic;">Your message:</p>
                <p style="color: #3d3155; font-size: 14px; margin: 0;">${fb.message.replace(/\n/g, "<br>")}</p>
              </div>
              <div style="border-left: 3px solid #c4b5e0; padding-left: 12px; margin-bottom: 16px;">
                <p style="color: #5a4a7a; font-size: 13px; margin: 0 0 8px 0;">Our reply:</p>
                <p style="color: #3d3155; font-size: 14px; margin: 0;">${reply.trim().replace(/\n/g, "<br>")}</p>
              </div>
              <p style="color: #b0a3c4; font-size: 12px;">— The Peacemind Team</p>
              <p style="color: #b0a3c4; font-size: 11px;"><a href="https://heal.peacemind.app" style="color: #7c6a9e;">heal.peacemind.app</a></p>
            </div>
          `,
        }),
      });
    } catch {
      // Email failed — reply still saved
    }
  }

  return NextResponse.json({ ok: true, emailed: !!fb?.user_email });
}
