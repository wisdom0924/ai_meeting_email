import { NextResponse } from "next/server";

const DEFAULT_MAKE_WEBHOOK =
  "https://hook.us2.make.com/cq56k8o1daqk6582t8kg85dgpts4mhe3";

function getMakeWebhookUrl(): string {
  return process.env.MEETING_WEBHOOK_URL?.trim() || DEFAULT_MAKE_WEBHOOK;
}

async function getSenderEmailFromSession(): Promise<string> {
  // TODO: FastAPI 백엔드 연동 후 세션/토큰에서 이메일 가져오기
  return "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const emailFrom = await getSenderEmailFromSession();
  const loginEmailHint = emailFrom.length > 0 ? "logged_in" : "not_logged_in";

  const payload = {
    ...(body as Record<string, unknown>),
    emailFrom,
    senderEmail: emailFrom,
    replyToEmail: emailFrom,
    loginEmailHint,
  };

  const webhookUrl = getMakeWebhookUrl();

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "웹훅 전송에 실패했습니다.", status: upstream.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("meeting-webhook:", e);
    return NextResponse.json({ error: "웹훅 전송 중 오류" }, { status: 500 });
  }
}
