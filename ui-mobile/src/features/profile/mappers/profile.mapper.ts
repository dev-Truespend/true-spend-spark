import { Profile, ProfileResponse } from "@/features/profile/types/profile.types";

export function toProfile(dto: ProfileResponse): Profile {
  return { ...dto, initials: computeInitials(dto.displayName, dto.email) };
}

function computeInitials(displayName: string, email: string): string {
  const source = displayName?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 1).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
