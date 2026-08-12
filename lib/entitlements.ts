import { supabase } from "@/lib/supabaseClient";

export type OpenScholarPlan =
  | "free"
  | "scholar";

export type SubscriptionStatus =
  | "active"
  | "pending"
  | "cancelled"
  | "expired"
  | "past_due";

export type OpenScholarEntitlements = {
  plan: OpenScholarPlan;
  status: SubscriptionStatus;

  is_scholar: boolean;

  /*
    Discovery
  */

  can_search: boolean;
  can_read_abstract: boolean;
  can_open_source: boolean;
  can_copy_citation: boolean;

  /*
    Library
  */

  saved_papers_count: number;
  saved_papers_limit: number;
  can_save_paper: boolean;

  /*
    Collections
  */

  collections_count: number;
  collections_limit: number;
  can_create_collection: boolean;

  /*
    Notes
  */

  notes_count: number;
  notes_limit: number;
  can_create_note: boolean;

  /*
    Alerts
  */

  active_alerts_count: number;
  active_alerts_limit: number;
  can_create_alert: boolean;

  /*
    Premium
  */

  can_manage_publications: boolean;
  can_use_full_profile: boolean;
  can_bulk_export: boolean;
};

export const FREE_ENTITLEMENTS: OpenScholarEntitlements = {
  plan: "free",
  status: "active",

  is_scholar: false,

  can_search: true,
  can_read_abstract: true,
  can_open_source: true,
  can_copy_citation: true,

  saved_papers_count: 0,
  saved_papers_limit: 100,
  can_save_paper: true,

  collections_count: 0,
  collections_limit: 3,
  can_create_collection: true,

  notes_count: 0,
  notes_limit: 10,
  can_create_note: true,

  active_alerts_count: 0,
  active_alerts_limit: 2,
  can_create_alert: true,

  can_manage_publications: false,
  can_use_full_profile: false,
  can_bulk_export: false,
};

export async function getMyEntitlements(): Promise<OpenScholarEntitlements> {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !authData.user
  ) {
    return FREE_ENTITLEMENTS;
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_openscholar_entitlements"
    );

  if (error) {
    console.error(
      "Unable to load OpenScholar-Web entitlements:",
      error
    );

    /*
      Safe fallback:
      premium capabilities remain unavailable.
    */
    return FREE_ENTITLEMENTS;
  }

  return {
    ...FREE_ENTITLEMENTS,
    ...(data as Partial<OpenScholarEntitlements>),
  };
}