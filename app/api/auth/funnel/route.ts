import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

const FLOW_COOKIE = "openscholar_auth_flow";
const FLOW_MAX_AGE_SECONDS = 30 * 60;

const EVENT_NAMES = [
  "sign_in_page_view",
  "sign_in_link_requested",
  "sign_in_link_request_failed",
  "sign_in_completed",
] as const;

const ERROR_CODES = [
  "invalid_request",
  "network_error",
  "rate_limited",
  "auth_request_failed",
] as const;

type FunnelEventName = (typeof EVENT_NAMES)[number];
type FunnelErrorCode = (typeof ERROR_CODES)[number];

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isEventName(value: unknown): value is FunnelEventName {
  return (
    typeof value === "string" &&
    (EVENT_NAMES as readonly string[]).includes(value)
  );
}

function isErrorCode(value: unknown): value is FunnelErrorCode {
  return (
    typeof value === "string" &&
    (ERROR_CODES as readonly string[]).includes(value)
  );
}

function getErrorResponse(status = 400) {
  return NextResponse.json(
    { error: "Unable to record funnel event." },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return getErrorResponse();
    }

    const bodyKeys = Object.keys(body);
    const allowedKeys =
      body.event_name === "sign_in_link_request_failed"
        ? ["event_name", "error_code"]
        : ["event_name"];

    if (
      bodyKeys.some((key) => !allowedKeys.includes(key)) ||
      !bodyKeys.includes("event_name") ||
      !isEventName(body.event_name)
    ) {
      return getErrorResponse();
    }

    const eventName = body.event_name;
    const errorCode =
      eventName === "sign_in_link_request_failed" &&
      isErrorCode(body.error_code)
        ? body.error_code
        : null;

    if (
      eventName === "sign_in_link_request_failed" &&
      !errorCode
    ) {
      return getErrorResponse();
    }

    const existingFlowId = request.cookies.get(FLOW_COOKIE)?.value;
    const flowId = isUuid(existingFlowId)
      ? existingFlowId
      : eventName === "sign_in_page_view"
        ? crypto.randomUUID()
        : null;

    if (!flowId) {
      return getErrorResponse();
    }

    const rateLimit = checkRateLimit({
      key: `auth-funnel:${eventName}:${flowId}`,
      limit: eventName === "sign_in_link_request_failed" ? 10 : 3,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return getErrorResponse(429);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return getErrorResponse(500);
    }

    if (eventName === "sign_in_completed") {
      const authorization = request.headers.get("authorization");

      if (!authorization?.startsWith("Bearer ")) {
        return getErrorResponse(401);
      }

      const accessToken = authorization.slice("Bearer ".length);
      const authClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
      const { data, error } = await authClient.auth.getUser(accessToken);

      if (error || !data.user) {
        return getErrorResponse(401);
      }
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { error } = await adminClient
      .from("openscholar_auth_funnel_events")
      .insert({
        occurred_at: new Date().toISOString(),
        event_name: eventName,
        flow_id: flowId,
        error_code: errorCode,
      });

    if (error && error.code !== "23505") {
      return getErrorResponse(500);
    }

    const response = NextResponse.json({ ok: true });

    if (eventName === "sign_in_page_view") {
      response.cookies.set(FLOW_COOKIE, flowId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: FLOW_MAX_AGE_SECONDS,
      });
    }

    if (eventName === "sign_in_completed") {
      response.cookies.set(FLOW_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  } catch {
    return getErrorResponse(500);
  }
}
