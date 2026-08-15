"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type ResearcherPhotoUploadProps = {
  user: User;
  claimId: string;
  currentPhotoUrl: string | null;
  onPhotoUpdated: (newUrl: string | null) => void;
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function ResearcherPhotoUpload({
  user,
  claimId,
  currentPhotoUrl,
  onPhotoUpdated,
}: ResearcherPhotoUploadProps) {
  const [uploading, setUploading] =
    useState(false);
  const [removing, setRemoving] =
    useState(false);
  const [message, setMessage] = useState("");
  const [fileInputKey, setFileInputKey] =
    useState(0);

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  async function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
      Validate file type and size
      client-side.
    */
    if (!ALLOWED_TYPES.includes(file.type)) {
      showMessage(
        `Invalid file type. Allowed: JPEG, PNG, WebP.`
      );
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      showMessage(
        `File is too large. Maximum: ${MAX_SIZE_MB} MB.`
      );
      return;
    }

    setUploading(true);

    try {
      /*
        Determine file extension from MIME
        type.
      */
      let extension = "jpg";
      if (file.type === "image/png") {
        extension = "png";
      } else if (file.type === "image/webp") {
        extension = "webp";
      }

      const storagePath = `${user.id}/profile.${extension}`;

      /*
        Upload to Supabase Storage.
        Storage RLS ensures only this user
        can write to their folder.
      */
      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("researcher-photos")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

      if (uploadError) {
        throw uploadError;
      }

      if (!uploadData) {
        throw new Error(
          "Upload returned no data."
        );
      }

      /*
        Construct public URL for the
        uploaded file.
      */
      const {
        data: urlData,
      } = supabase.storage
        .from("researcher-photos")
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      /*
        Update researcher_profile_claims
        via RPC set_my_researcher_profile_photo.
        This respects RLS for verified claims.
      */
      const { error: profileUpdateError } =
        await supabase.rpc(
          "set_my_researcher_profile_photo",
          {
            p_claim_id: claimId,
            p_profile_photo_url: publicUrl,
          }
        );

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      /*
        Notify parent component of
        successful update.
      */
      onPhotoUpdated(publicUrl);

      showMessage(
        "Profile photo updated successfully."
      );

      /*
        Reset file input to allow
        re-selection of same file.
      */
      setFileInputKey((prev) => prev + 1);
    } catch (error) {
      console.error(
        "Photo upload failed:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to upload photo. Please try again.";

      showMessage(errorMessage);
    } finally {
      setUploading(false);
    }
  }

  async function handlePhotoRemove() {
    const confirmed = window.confirm(
      "Remove your profile photo?"
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);

    try {
      if (currentPhotoUrl) {
        /*
          Determine the storage path
          from current photo URL.
        */
        const urlParts =
          currentPhotoUrl.split("/");

        const filename =
          urlParts[urlParts.length - 1];

        const storagePath =
          `${user.id}/${filename}`;

        /*
          Delete from storage.
        */
        const { error: deleteError } =
          await supabase.storage
            .from("researcher-photos")
            .remove([storagePath]);

        if (deleteError) {
          throw deleteError;
        }
      }

      /*
        Clear profile_photo_url field
        via RPC set_my_researcher_profile_photo
        with null value.
      */
      const { error: profileUpdateError } =
        await supabase.rpc(
          "set_my_researcher_profile_photo",
          {
            p_claim_id: claimId,
            p_profile_photo_url: null,
          }
        );

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      /*
        Notify parent component.
      */
      onPhotoUpdated(null);

      showMessage("Profile photo removed.");
    } catch (error) {
      console.error(
        "Photo removal failed:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to remove photo. Please try again.";

      showMessage(errorMessage);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            pointerEvents:
              uploading || removing
                ? "none"
                : "auto",
            opacity:
              uploading || removing
                ? 0.6
                : 1,
          }}
        >
          {uploading
            ? "Uploading..."
            : "Change Photo"}
          <input
            key={fileInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading || removing}
            className="hidden"
          />
        </label>

        {currentPhotoUrl && (
          <button
            type="button"
            onClick={handlePhotoRemove}
            disabled={removing || uploading}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>

      {message && (
        <p className="text-xs font-semibold text-slate-600">
          {message}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Max {MAX_SIZE_MB} MB · JPEG, PNG, or
        WebP
      </p>
    </div>
  );
}
