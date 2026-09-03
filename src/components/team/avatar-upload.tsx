"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProfileRow } from "@/lib/queries/settings";

const MAX_FILE_BYTES = 3 * 1024 * 1024;

/**
 * A round photo with a camera-icon overlay — click to replace. Uploaded to
 * a per-user folder in the public `avatars` bucket under a fresh filename
 * each time (rather than a fixed name), so the new URL is never behind a
 * stale CDN-cached copy of the old one; the previous file is simply left
 * behind, same tradeoff every other upload form in this app already makes.
 */
export function AvatarUpload({
  profile,
  displayLabel,
}: {
  profile: ProfileRow;
  displayLabel: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image is too large", { description: "Max 3MB." });
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      setIsUploading(false);
      toast.error("Failed to upload photo", { description: uploadError.message });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);
    setIsUploading(false);

    if (error) {
      toast.error("Failed to save photo", { description: error.message });
      return;
    }

    toast.success("Photo updated");
    router.refresh();
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="group/upload relative rounded-full"
        aria-label="Change photo"
      >
        <Avatar size="lg" className="size-16">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayLabel} />
          <AvatarFallback className="bg-gold text-base font-semibold text-ink">
            {displayLabel.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover/upload:bg-black/40">
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-white" />
          ) : (
            <Camera className="size-4 text-white opacity-0 transition-opacity group-hover/upload:opacity-100" />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
