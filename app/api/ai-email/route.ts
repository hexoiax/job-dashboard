// app/api/ai-email/route.ts
import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { messages, system } = await req.json();

    if (!messages || !system) {
      return NextResponse.json(
        { error: { message: "Thiếu messages hoặc system prompt" } },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: [
          { role: "system", content: system },
          ...messages,
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: { message: data.error?.message || "Groq API error" } },
        { status: res.status }
      );
    }

    // Chuẩn hoá response về cùng format để page.js không cần sửa gì
    const text = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({
      content: [{ type: "text", text }],
    });

  } catch (e: any) {
    console.error("[ai-email]", e);
    return NextResponse.json(
      { error: { message: "Lỗi hệ thống: " + e.message } },
      { status: 500 }
    );
  }
}
