import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export async function GET(
  request: Request
) {
  try {
    /*
      1. Read authenticated user's
      Supabase access token.
    */

    const authorization =
      request.headers.get(
        "authorization"
      );

    const accessToken =
      authorization?.startsWith(
        "Bearer "
      )
        ? authorization.slice(7)
        : null;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Supabase environment variables missing."
      );

      return NextResponse.json(
        {
          error:
            "Server configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      2. Validate the authenticated
      Supabase user.
    */

    const authSupabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },

          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } =
      await authSupabase
        .auth
        .getUser(
          accessToken
        );

    const user =
      userData.user;

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid authentication.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      3. Service-role client.

      This is used only after
      authentication and admin
      authorization.
    */

    const adminSupabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    /*
      4. Verify OpenScholar admin.

      We use the existing
      openscholar_admins table.
    */

    const {
      data: adminRecord,
      error: adminError,
    } =
      await adminSupabase
        .from(
          "openscholar_admins"
        )
        .select(
          "user_id"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (adminError) {
      console.error(
        "Unable to verify OpenScholar admin:",
        adminError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify administrator.",
        },
        {
          status: 500,
        }
      );
    }

    if (!adminRecord) {
      return NextResponse.json(
        {
          error:
            "Administrator access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      5. Read optional filters.
    */

    const url =
      new URL(
        request.url
      );

    const action =
      url.searchParams
        .get("action")
        ?.trim();

    const source =
      url.searchParams
        .get("source")
        ?.trim();

    const search =
      url.searchParams
        .get("search")
        ?.trim();

    const limitParam =
      Number(
        url.searchParams.get(
          "limit"
        ) || "100"
      );

    const limit =
      Number.isFinite(
        limitParam
      )
        ? Math.min(
            Math.max(
              Math.floor(
                limitParam
              ),
              1
            ),
            200
          )
        : 100;

    /*
      6. Query audit trail.
    */

    let query =
      adminSupabase
        .from(
          "openscholar_subscription_audit"
        )
        .select(
          `
            id,
            user_id,
            action,
            source,
            provider,
            provider_subscription_id,
            provider_payment_id,
            previous_status,
            new_status,
            billing_cycle,
            message,
            metadata,
            created_at
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(limit);

    if (action) {
      query =
        query.eq(
          "action",
          action
        );
    }

    if (source) {
      query =
        query.eq(
          "source",
          source
        );
    }

    if (search) {
      const safeSearch =
        search
          .replaceAll(
            ",",
            ""
          )
          .replaceAll(
            "(",
            ""
          )
          .replaceAll(
            ")",
            ""
          );

      query =
        query.or(
          [
            `provider_subscription_id.ilike.%${safeSearch}%`,
            `provider_payment_id.ilike.%${safeSearch}%`,
            `action.ilike.%${safeSearch}%`,
            `message.ilike.%${safeSearch}%`,
          ].join(",")
        );
    }

    const {
      data: auditEvents,
      error: auditError,
    } =
      await query;

    if (auditError) {
      console.error(
        "Unable to load subscription audit trail:",
        auditError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load subscription audit trail.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        events:
          auditEvents ?? [],

        count:
          auditEvents?.length ??
          0,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Admin subscription audit API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load subscription audit trail.",
      },
      {
        status: 500,
      }
    );
  }
}