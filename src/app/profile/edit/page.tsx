"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, User, Save, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function EditProfilePage() {
  const { user, profile, isLoading, updateProfile, getAccessToken } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when profile loads
  const [initialized, setInitialized] = useState(false);
  if (profile && !initialized) {
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setInitialized(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    router.replace("/auth/login");
    return null;
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Upload avatar if changed
      if (avatarFile) {
        const token = await getAccessToken();
        const formData = new FormData();
        formData.append("avatar", avatarFile);

        const res = await fetch("/api/profile/avatar", {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to upload avatar");
        }
      }

      // Update profile fields
      const result = await updateProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(true);
      setAvatarFile(null);
      setTimeout(() => {
        router.push(`/profile/${profile.username}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || profile.avatar_url;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-text-primary mb-8">Edit Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          {currentAvatar ? (
            <Image
              src={currentAvatar}
              alt="Avatar"
              width={112}
              height={112}
              className="rounded-full object-cover w-28 h-28 border-2 border-border-subtle"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gold-subtle flex items-center justify-center border-2 border-border-subtle">
              <User size={40} className="text-gold" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label="Change avatar"
          >
            <Camera size={24} className="text-white" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 text-sm text-gold hover:text-gold-hover font-medium transition-colors"
        >
          Change photo
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={profile.username}
            disabled
            className="w-full px-3 py-2.5 text-sm bg-bg-tertiary text-text-tertiary border border-border-subtle rounded-[var(--radius-md)] cursor-not-allowed"
          />
          <p className="text-xs text-text-tertiary mt-1">Username cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            maxLength={50}
            className="w-full px-3 py-2.5 text-sm bg-bg-primary text-text-primary placeholder:text-text-tertiary border border-border-subtle rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about your movie taste..."
            rows={3}
            maxLength={300}
            className="w-full px-3 py-2.5 text-sm bg-bg-primary text-text-primary placeholder:text-text-tertiary border border-border-subtle rounded-[var(--radius-md)] resize-y focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
          />
          {bio.length > 0 && (
            <p className="text-xs text-text-tertiary mt-1 text-right">
              {bio.length} / 300
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500 font-medium">{error}</p>
      )}

      {success && (
        <p className="mt-4 text-sm text-score-high font-medium">
          Profile updated! Redirecting...
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-[var(--radius-pill)] bg-gold text-bg-primary hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? (
          "Saving..."
        ) : (
          <>
            <Save size={16} />
            Save changes
          </>
        )}
      </button>
    </div>
  );
}
