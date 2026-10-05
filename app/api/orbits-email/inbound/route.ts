import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function normaliseAddresses(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function getHeader(headers: unknown, name: string): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  if (Array.isArray(headers)) {
    for (const item of headers) {
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const key = String(row.name ?? row.key ?? "").toLowerCase();
        if (key === target) return String(row.value ?? "") || null;
      }
    }
  }
  if (typeof headers === "object") {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (key.toLowerCase() === target) return String(value ?? "") || null;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!resendKey || !webhookSecret || !supabaseUrl || !supabaseSecret) {
    console.error("Orbits email webhook is missing required server configuration");
    return new NextResponse("Unavailable", { status: 503 });
  }

  try {
    const payload = await req.text();
    const resend = new Resend(resendKey);
    const event = resend.webhooks.verify({
      payload,
      headers: {
        "svix-id": req.headers.get("svix-id"),
        "svix-timestamp": req.headers.get("svix-timestamp"),
        "svix-signature": req.headers.get("svix-signature"),
      },
      secret: webhookSecret,
    });

    if (event.type !== "email.received") {
      return new NextResponse("OK", { status: 200 });
    }

    const { data: email, error: receiveError } = await resend.emails.receiving.get(event.data.email_id);
    if (receiveError || !email) {
      console.error("Unable to retrieve inbound email", receiveError);
      return new NextResponse("Error", { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const from = String(email.from ?? event.data.from ?? "").trim();
    const to = normaliseAddresses(email.to ?? event.data.to);
    const cc = normaliseAddresses(email.cc);
    const subject = String(email.subject ?? event.data.subject ?? "").slice(0, 998);
    const messageId = getHeader(email.headers, "message-id");
    const inReplyTo = getHeader(email.headers, "in-reply-to");
    const externalThreadId = inReplyTo || messageId || event.data.email_id;

    const { data: existingThread, error: lookupError } = await supabase
      .from("orbits_email_threads")
      .select("id")
      .eq("external_thread_id", externalThreadId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let threadId = existingThread?.id as string | undefined;
    if (!threadId) {
      const participants = Array.from(new Set([from, ...to, ...cc].filter(Boolean)));
      const { data: createdThread, error: threadError } = await supabase
        .from("orbits_email_threads")
        .insert({
          external_thread_id: externalThreadId,
          product: "general",
          subject,
          participant_emails: participants,
        })
        .select("id")
        .single();
      if (threadError) throw threadError;
      threadId = createdThread.id;
    }

    const { error: messageError } = await supabase
      .from("orbits_email_messages")
      .upsert(
        {
          thread_id: threadId,
          resend_email_id: event.data.email_id,
          direction: "inbound",
          sender: from,
          recipients: to,
          cc,
          subject,
          text_body: typeof email.text === "string" ? email.text : null,
          html_body: typeof email.html === "string" ? email.html : null,
          message_id: messageId,
          in_reply_to: inReplyTo,
          received_at: new Date().toISOString(),
        },
        { onConflict: "resend_email_id", ignoreDuplicates: true }
      );

    if (messageError) throw messageError;

    await supabase
      .from("orbits_email_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Orbits inbound email webhook error", error);
    return new NextResponse("Error", { status: 400 });
  }
}
