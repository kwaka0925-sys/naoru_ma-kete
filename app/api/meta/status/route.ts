import { NextResponse } from "next/server";
import { fetchAccountInfo, normalizeAccountId } from "@/lib/meta-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const configured = Boolean(accessToken && accountId);
  if (!configured) {
    return NextResponse.json({
      configured: false,
      reason: "META_ACCESS_TOKEN または META_AD_ACCOUNT_ID が未設定です。",
    });
  }

  try {
    const info = await fetchAccountInfo({ accountId: accountId!, accessToken: accessToken! });
    return NextResponse.json({
      configured: true,
      connected: true,
      accountId: normalizeAccountId(accountId!),
      accountName: info.name,
      currency: info.currency,
      accountStatus: info.account_status,
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      connected: false,
      accountId: normalizeAccountId(accountId!),
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
