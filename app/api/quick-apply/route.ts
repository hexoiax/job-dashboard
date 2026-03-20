// app/api/quick-apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { Readable } from "stream";

// ─── ENV ─────────────────────────────────────────────────────
const MAIL_USER          = process.env.MAIL_USER!;
const MAIL_PASS          = process.env.MAIL_PASS!;
const DRIVE_CLIENT_ID    = process.env.DRIVE_CLIENT_ID!;
const DRIVE_CLIENT_SECRET= process.env.DRIVE_CLIENT_SECRET!;
const DRIVE_REFRESH_TOKEN= process.env.DRIVE_REFRESH_TOKEN!;
const DRIVE_FOLDER_ID    = process.env.DRIVE_FOLDER_ID!;
const SHEET_API          = process.env.SHEET_API!;

const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB

// ─── DRIVE SERVICE ───────────────────────────────────────────
async function uploadCvToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; fileLink: string }> {
  const auth = new google.auth.OAuth2(DRIVE_CLIENT_ID, DRIVE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: DRIVE_REFRESH_TOKEN });

  const drive = google.drive({ version: "v3", auth });

  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id!,
    fileLink: res.data.webViewLink || "",
  };
}

// ─── SHEET SERVICE ────────────────────────────────────────────
async function writeApplicationToSheet(row: Record<string, string>) {
  const res = await fetch(`${SHEET_API}/Applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([row]),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheet write failed: ${text}`);
  }
}

// ─── DEDUPE CHECK (đọc sheet, check userId+jobId) ─────────────
async function checkDuplicate(jobId: string, candidateEmail: string): Promise<boolean> {
  try {
    const res = await fetch(`${SHEET_API}/Applications`);
    if (!res.ok) return false;
    const rows: Record<string, string>[] = await res.json();
    return rows.some(
      r => r.jobId === jobId && r.userEmail === candidateEmail
    );
  } catch {
    return false; // nếu check lỗi thì cho qua, backend ghi sẽ tạo duplicate nhưng không block UX
  }
}

// ─── MAIL SERVICE ─────────────────────────────────────────────
async function sendMail(opts: {
  to: string;
  replyTo: string;
  subject: string;
  body: string;
  cvBuffer: Buffer;
  cvFileName: string;
}): Promise<string> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });

  const info = await transporter.sendMail({
    from: `"Da Nang Ecom Jobs" <${MAIL_USER}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.body,
    attachments: [
      {
        filename: opts.cvFileName,
        content: opts.cvBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return info.messageId || "";
}

// ─── MAIN HANDLER ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Parse fields
    const cvFile         = formData.get("cv") as File | null;
    const jobId          = (formData.get("jobId") as string || "").trim();
    const jobTitle       = (formData.get("jobTitle") as string || "").trim();
    const companyName    = (formData.get("companyName") as string || "").trim();
    const recruiterEmail = (formData.get("recruiterEmail") as string || "").trim();
    const subject        = (formData.get("subject") as string || "").trim();
    const body           = (formData.get("body") as string || "").trim();
    const candidateName  = (formData.get("candidateName") as string || "").trim();
    const candidateEmail = (formData.get("candidateEmail") as string || "").trim();
    const candidatePhone = (formData.get("candidatePhone") as string || "").trim();

    // ── Validate ──────────────────────────────────────────────
    if (!cvFile)
      return NextResponse.json({ error: { code: "NO_CV", message: "Thiếu file CV" } }, { status: 400 });

    if (cvFile.type !== "application/pdf")
      return NextResponse.json({ error: { code: "INVALID_CV_TYPE", message: "Chỉ nhận PDF" } }, { status: 400 });

    if (cvFile.size > MAX_CV_SIZE)
      return NextResponse.json({ error: { code: "CV_TOO_LARGE", message: "CV tối đa 5MB" } }, { status: 400 });

    if (!recruiterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recruiterEmail))
      return NextResponse.json({ error: { code: "INVALID_RECRUITER_EMAIL", message: "Email nhà tuyển dụng không hợp lệ" } }, { status: 400 });

    if (!candidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail))
      return NextResponse.json({ error: { code: "INVALID_CANDIDATE_EMAIL", message: "Email ứng viên không hợp lệ" } }, { status: 400 });

    if (!subject || !body)
      return NextResponse.json({ error: { code: "MISSING_CONTENT", message: "Thiếu tiêu đề hoặc nội dung email" } }, { status: 400 });

    // ── Dedupe check ──────────────────────────────────────────
    const isDuplicate = await checkDuplicate(jobId, candidateEmail);
    if (isDuplicate)
      return NextResponse.json({ error: { code: "DUPLICATE_APPLY", message: "Bạn đã ứng tuyển vị trí này rồi" } }, { status: 409 });

    // ── Đọc CV buffer ─────────────────────────────────────────
    const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
    const timestamp = Date.now();
    const safeEmail = candidateEmail.replace(/[^a-z0-9]/gi, "_");
    const storedFileName = `${safeEmail}_${timestamp}_cv.pdf`;

    // ── Upload Drive ──────────────────────────────────────────
    let driveFileId = "";
    let driveLink   = "";
    try {
      const uploaded = await uploadCvToDrive(cvBuffer, storedFileName, "application/pdf");
      driveFileId = uploaded.fileId;
      driveLink   = uploaded.fileLink;
    } catch (e: any) {
      return NextResponse.json(
        { error: { code: "DRIVE_UPLOAD_FAILED", message: "Upload CV thất bại: " + e.message } },
        { status: 500 }
      );
    }

    // ── Gửi mail ──────────────────────────────────────────────
    let providerMessageId = "";
    try {
      providerMessageId = await sendMail({
        to: recruiterEmail,
        replyTo: candidateEmail,
        subject,
        body,
        cvBuffer,
        cvFileName: cvFile.name || storedFileName,
      });
    } catch (e: any) {
      // Mail fail → ghi log vào sheet với status failed, không throw ra ngoài
      await writeApplicationToSheet({
        applicationId:   `app_${timestamp}`,
        jobId,
        jobTitle,
        companyName,
        companyEmail:    recruiterEmail,
        userEmail:       candidateEmail,
        userFullName:    candidateName,
        userPhone:       candidatePhone,
        cvDriveLink:     driveLink,
        subject,
        bodySnapshot:    body,
        status:          "failed",
        providerMessageId: "",
        errorReason:     e.message,
        appliedAt:       new Date().toISOString(),
      }).catch(() => {}); // best-effort

      return NextResponse.json(
        { error: { code: "MAIL_SEND_FAILED", message: "Gửi email thất bại: " + e.message } },
        { status: 500 }
      );
    }

    // ── Ghi Applications sheet (snapshot) ─────────────────────
    const applicationId = `app_${timestamp}`;
    await writeApplicationToSheet({
      applicationId,
      jobId,
      jobTitle,
      companyName,
      companyEmail:      recruiterEmail,
      userEmail:         candidateEmail,
      userFullName:      candidateName,
      userPhone:         candidatePhone,
      cvDriveLink:       driveLink,
      subject,
      bodySnapshot:      body,
      status:            "sent",
      providerMessageId,
      errorReason:       "",
      appliedAt:         new Date().toISOString(),
    });

    return NextResponse.json({ success: true, applicationId, status: "sent" });

  } catch (e: any) {
    console.error("[quick-apply]", e);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Lỗi hệ thống: " + e.message } },
      { status: 500 }
    );
  }
}
