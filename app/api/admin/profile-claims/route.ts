import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

type ReviewAction =
  | "verified"
  | "rejected";

async function getAdminContext(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const accessToken =
    authorization.slice(7);

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
    return {
      error: NextResponse.json(
        {
          error:
            "Server configuration error.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const authClient =
    createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
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
    await authClient.auth.getUser(
      accessToken
    );

  if (
    userError ||
    !userData.user
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const adminClient =
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

  const {
    data: adminRecord,
    error: adminError,
  } =
    await adminClient
      .from(
        "openscholar_admins"
      )
      .select(
        "user_id"
      )
      .eq(
        "user_id",
        userData.user.id
      )
      .maybeSingle();

  if (adminError) {
    console.error(
      "Unable to verify administrator:",
      adminError
    );

    return {
      error: NextResponse.json(
        {
          error:
            "Unable to verify administrator.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!adminRecord) {
    return {
      error: NextResponse.json(
        {
          error:
            "Administrator access required.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    adminClient,
    adminUser:
      userData.user,
  };
}

export async function GET(
  request: Request
) {
  try {
    const context =
      await getAdminContext(
        request
      );

    if ("error" in context) {
      return context.error;
    }

    const {
      adminClient,
    } = context;

    const {
      data,
      error,
    } =
      await adminClient
        .from(
          "researcher_profile_claims"
        )
        .select(
          `
            id,
            user_id,
            openalex_author_id,
            researcher_name,
            affiliation,
            orcid,
            claim_status,
            verification_method,
            verification_note,
            claimed_at,
            verified_at,
            updated_at
          `
        )
        .in(
          "claim_status",
          [
            "pending",
            "rejected",
          ]
        )
        .order(
          "claimed_at",
          {
            ascending: true,
          }
        );

    if (error) {
      console.error(
        "Unable to load profile claims:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load profile claims.",
        },
        {
          status: 500,
        }
      );
    }

    const claims =
      await Promise.all(
        (data || []).map(
          async (claim) => {
            let claimantEmail:
              | string
              | null = null;

            try {
              const {
                data:
                  authUserData,
              } =
                await adminClient
                  .auth
                  .admin
                  .getUserById(
                    claim.user_id
                  );

              claimantEmail =
                authUserData.user
                  ?.email ??
                null;
            } catch (
              error
            ) {
              console.error(
                "Unable to load claimant email:",
                error
              );
            }

            return {
              ...claim,

              claimant_email:
                claimantEmail,
            };
          }
        )
      );

    return NextResponse.json(
      {
        claims,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Admin profile claims API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load profile claims.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const context =
      await getAdminContext(
        request
      );

    if ("error" in context) {
      return context.error;
    }

    const {
      adminClient,
      adminUser,
    } = context;

    const body =
      await request.json();

    const claimId =
      typeof body?.claimId ===
      "string"
        ? body.claimId.trim()
        : "";

    const action =
      body?.action as
        | ReviewAction
        | undefined;

    const reviewNote =
      typeof body?.reviewNote ===
      "string"
        ? body.reviewNote.trim()
        : "";

    if (!claimId) {
      return NextResponse.json(
        {
          error:
            "Claim ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !==
        "verified" &&
      action !==
        "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid review action.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action ===
        "rejected" &&
      !reviewNote
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a reason for rejection.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existingClaim,
      error:
        existingClaimError,
    } =
      await adminClient
        .from(
          "researcher_profile_claims"
        )
        .select(
          `
            id,
            user_id,
            openalex_author_id,
            researcher_name,
            claim_status
          `
        )
        .eq(
          "id",
          claimId
        )
        .maybeSingle();

    if (
      existingClaimError
    ) {
      throw existingClaimError;
    }

    if (!existingClaim) {
      return NextResponse.json(
        {
          error:
            "Profile claim not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      existingClaim
        .claim_status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Only pending claims can be reviewed.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Prevent two users from becoming
      verified owners of the same
      OpenAlex researcher profile.
    */

    if (
      action ===
      "verified"
    ) {
      const {
        data:
          existingVerifiedClaim,
        error:
          verifiedCheckError,
      } =
        await adminClient
          .from(
            "researcher_profile_claims"
          )
          .select(
            "id, user_id"
          )
          .eq(
            "openalex_author_id",
            existingClaim
              .openalex_author_id
          )
          .eq(
            "claim_status",
            "verified"
          )
          .neq(
            "id",
            claimId
          )
          .maybeSingle();

      if (
        verifiedCheckError
      ) {
        throw verifiedCheckError;
      }

      if (
        existingVerifiedClaim
      ) {
        return NextResponse.json(
          {
            error:
              "This researcher profile already has a verified owner.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const now =
      new Date().toISOString();

    const verificationNote =
      reviewNote ||
      (
        action ===
        "verified"
          ? "Profile ownership verified by OpenScholar administrator."
          : null
      );

    const {
      data: updatedClaim,
      error: updateError,
    } =
      await adminClient
        .from(
          "researcher_profile_claims"
        )
        .update({
  claim_status:
    action,

  verification_note:
    verificationNote,

  verified_at:
    action ===
    "verified"
      ? now
      : null,

  updated_at:
    now,
})
        .eq(
          "id",
          claimId
        )
        .select("*")
        .single();

    if (updateError) {
      throw updateError;
    }

    console.info(
      "Researcher profile claim reviewed",
      {
        claimId,

        action,

        adminUserId:
          adminUser.id,

        researcherId:
          existingClaim
            .openalex_author_id,
      }
    );

    return NextResponse.json(
      {
        success: true,

        claim:
          updatedClaim,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Unable to review profile claim:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to review profile claim.",
      },
      {
        status: 500,
      }
    );
  }
}