import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmailChangeDialog } from "@/components/auth/EmailChangeDialog";
import { PasswordChangeDialog } from "@/components/auth/PasswordChangeDialog";
import {
  Loader2, Upload, Trash2, Mail, Lock, CheckCircle2,
  AlertCircle, User as UserIcon, KeyRound,
} from "lucide-react";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Full profile editor: avatar, name, phone, email, password.
 * Replaces the previous "drop the UserProfileDropdown in a tab" hack.
 */
export function ProfileEditor() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  // ── Local form state ────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [emailDialogOpen, setEmailDialogOpen]       = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Hydrate form when profile loads / changes
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    // phone isn't in the Profile interface — read raw from auth metadata
    setPhone((user?.user_metadata?.phone as string | undefined) ?? "");
    // avatar from user metadata (Supabase Storage URL or OAuth provider)
    setAvatarUrl(
      (user?.user_metadata?.avatar_url as string | undefined) ??
      (user?.user_metadata?.picture as string | undefined) ??
      null
    );
  }, [profile, user]);

  // Dirty check so Save is disabled until something changes
  const isDirty =
    (firstName !== (profile?.first_name ?? "")) ||
    (lastName  !== (profile?.last_name  ?? "")) ||
    (phone     !== ((user?.user_metadata?.phone as string | undefined) ?? ""));

  // ── Save profile mutation ──────────────────────────────────────────
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

      // 1. profiles row
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name:  lastName.trim()  || null,
          full_name:  fullName,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // 2. auth.users metadata (so it survives even if profile row breaks)
      const { error: aErr } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim() || null,
          last_name:  lastName.trim()  || null,
          full_name:  fullName,
          phone:      phone.trim() || null,
        },
      });
      if (aErr) throw aErr;
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      // Force useAuth to re-fetch the profile by invalidating any related caches
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    },
  });

  // ── Avatar upload / remove ─────────────────────────────────────────
  const handleAvatarFile = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: "Image too large", description: "Max 2 MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Not an image", description: "Pick a PNG, JPG, or WebP.", variant: "destructive" });
      return;
    }

    setAvatarBusy(true);
    try {
      const ext  = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const url = publicData.publicUrl;

      // Persist to user_metadata so it's available across tabs and on refresh
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
      if (metaErr) throw metaErr;

      setAvatarUrl(url);
      toast({ title: "Avatar updated" });
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast({
        title: "Couldn't upload avatar",
        description: err instanceof Error ? err.message : "Try a different image.",
        variant: "destructive",
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await supabase.auth.updateUser({ data: { avatar_url: null, picture: null } });
      setAvatarUrl(null);
      toast({ title: "Avatar removed" });
    } catch (err) {
      toast({
        title: "Couldn't remove",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  // ── Derived display ─────────────────────────────────────────────────
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() ||
                   (profile?.email?.[0]?.toUpperCase() ?? "?");

  const isVerified = !!profile?.email_verified_at;
  const providers  = profile?.auth_providers ?? [];

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Avatar + identity ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile photo</CardTitle>
          <CardDescription>Optional. Used in headers and emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarFile(f);
                  e.target.value = ""; // allow re-selecting same file
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  disabled={avatarBusy}
                  className="gap-2"
                >
                  {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                    disabled={avatarBusy}
                    className="gap-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. Max 2 MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Name + phone ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal info</CardTitle>
          <CardDescription>Your name appears in the app and on email receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pe-first">First name</Label>
              <Input
                id="pe-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pe-last">Last name</Label>
              <Input
                id="pe-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pe-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="pe-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">For SMS alerts. We never share it.</p>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={!isDirty || saveProfile.isPending}
              className="gap-2"
            >
              {saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Email ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email address
          </CardTitle>
          <CardDescription>
            Used for sign-in, receipts, and security alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {isVerified ? (
                  <Badge variant="outline" className="gap-1 border-green-500/50 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    Not verified
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Password / sign-in method ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Password &amp; sign-in
          </CardTitle>
          <CardDescription>
            Manage how you sign in to TrueSpend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected providers */}
          <div>
            <p className="text-sm font-medium mb-2">Connected providers</p>
            <div className="flex flex-wrap gap-2">
              {providers.length === 0 ? (
                <Badge variant="outline" className="gap-1">
                  <KeyRound className="h-3 w-3" />
                  Email + password
                </Badge>
              ) : (
                providers.map((p) => (
                  <Badge key={p} variant="outline" className="gap-1 capitalize">
                    {p === "google" ? "🔵" : <KeyRound className="h-3 w-3" />}
                    {p === "email" ? "Email + password" : p}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Password change */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Password</p>
              <p className="text-xs text-muted-foreground">
                {providers.includes("email") || providers.length === 0
                  ? "Change your password regularly to keep your account safe."
                  : "You sign in with a third-party provider. Set a password to also enable email sign-in."}
              </p>
            </div>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
              {providers.includes("email") || providers.length === 0 ? "Change" : "Set"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Account ID (for support) ──────────────────────────────── */}
      <div className="px-1 text-xs text-muted-foreground">
        Account ID: <code className="font-mono">{user?.id}</code>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <EmailChangeDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
      <PasswordChangeDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  );
}
