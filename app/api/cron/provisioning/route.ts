import { timingSafeEqual } from "node:crypto";
import { dispatchOwnerInvitations } from "@/lib/platform/admin/owner-invitation-delivery";
import { sendEmail } from "@/lib/platform/inbox/inbox-providers";

export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET no está configurado." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: "No autorizado." }, { status: 401 });
  return Response.json(await dispatchOwnerInvitations(sendEmail));
}
