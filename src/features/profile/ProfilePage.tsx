import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Camera, Loader2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useBlocker } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "../../services/api/client";
import { countActivityForActorSince, listActivityForActor } from "../../services/activityLog";
import { defaultNotificationPrefs, type NotificationPrefs } from "../../shared/types/domain";
import { Card } from "../../shared/components/ui/card";
import { useAuthStore } from "../auth/store";
import { passwordChangeSchema, profileEditSchema, type PasswordChangeValues, type ProfileEditValues } from "./profileSchemas";
import { RoleBadge } from "./RoleBadge";

dayjs.extend(relativeTime);

function deviceFingerprint(): string {
  const k = "timesheet-device-id";
  try {
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      sessionStorage.setItem(k, v);
    }
    return v.slice(0, 8);
  } catch {
    return "browser";
  }
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)!;
  const patchUser = useAuthStore((s) => s.patchUser);
  const queryClient = useQueryClient();
  const device = useMemo(() => deviceFingerprint(), []);

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: () => apiClient.getProfile(user.id),
  });

  const profileForm = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const passwordForm = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const prefsForm = useForm<NotificationPrefs>({
    defaultValues: defaultNotificationPrefs(),
  });

  useEffect(() => {
    if (!profile.data) return;
    profileForm.reset({
      name: profile.data.name,
      email: profile.data.email,
      phone: profile.data.phone,
    });
    prefsForm.reset(profile.data.notificationPrefs);
  }, [profile.data, profileForm, prefsForm]);

  const [passwordToast, setPasswordToast] = useState(false);

  const dirty =
    profileForm.formState.isDirty || passwordForm.formState.isDirty || prefsForm.formState.isDirty;

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (!dirty) return false;
        return (
          currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
        );
      },
      [dirty]
    )
  );

  const blockerHandled = useRef(false);
  useEffect(() => {
    if (blocker.state !== "blocked") {
      blockerHandled.current = false;
      return;
    }
    if (blockerHandled.current) return;
    blockerHandled.current = true;
    const ok = window.confirm("You have unsaved changes. Leave this page without saving?");
    if (ok) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const updateProfile = useMutation({
    mutationFn: (values: ProfileEditValues) => apiClient.updateProfile(user.id, values),
    onSuccess: (session) => {
      patchUser(session);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      profileForm.reset({
        name: session.name,
        email: session.email,
        phone: session.phone,
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordChangeValues) =>
      apiClient.changePassword(user.id, values.currentPassword, values.newPassword),
    onSuccess: () => {
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordToast(true);
      window.setTimeout(() => setPasswordToast(false), 4500);
    },
  });

  const savePrefs = useMutation({
    mutationFn: (prefs: NotificationPrefs) => apiClient.updateNotificationPreferences(user.id, prefs),
    onSuccess: (session) => {
      patchUser(session);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      prefsForm.reset(session.notificationPrefs);
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (dataUrl: string | null) => apiClient.updateAvatar(user.id, dataUrl),
    onSuccess: (session) => {
      patchUser(session);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    },
  });

  const revokeSessions = useMutation({
    mutationFn: () => apiClient.revokeAllSessionsMock(user.id),
    onSuccess: ({ mockSessionEpoch }) => {
      patchUser({ mockSessionEpoch });
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    },
  });

  const [avatarError, setAvatarError] = useState<string | null>(null);

  const onPickAvatar = (file: File | null) => {
    setAvatarError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 280 * 1024) {
      setAvatarError("Image must be about 250KB or smaller for this demo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") uploadAvatar.mutate(r);
    };
    reader.onerror = () => setAvatarError("Could not read this file.");
    reader.readAsDataURL(file);
  };

  const since7d = useMemo(() => dayjs().subtract(7, "day").toISOString(), []);
  const recentActions = useMemo(() => listActivityForActor(user.id, 6), [user.id, profile.data?.mockSessionEpoch]);
  const weeklyCount = useMemo(() => countActivityForActorSince(user.id, since7d), [user.id, since7d, profile.data?.mockSessionEpoch]);

  if (profile.isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading profile…
      </div>
    );
  }

  if (profile.isError) {
    return <p className="text-sm text-destructive">{(profile.error as Error).message}</p>;
  }

  const p = profile.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your identity, security, and preferences.</p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-lg font-semibold text-foreground">
              {p.avatarDataUrl ? (
                <img src={p.avatarDataUrl} alt="" className="size-full object-cover" />
              ) : (
                p.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-sm">
              <Camera className="size-4 text-foreground" />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                disabled={uploadAvatar.isPending}
              />
            </label>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-foreground">{p.name}</h2>
              <RoleBadge role={p.role} />
            </div>
            <p className="text-sm text-muted-foreground">{p.email}</p>
            {p.phone ? <p className="text-sm text-muted-foreground">{p.phone}</p> : null}
            {p.role === "employee" && p.hourlyRate != null ? (
              <p className="text-xs text-muted-foreground">
                Hourly rate ₹{p.hourlyRate} · joined {p.employeeJoinedAt ? dayjs(p.employeeJoinedAt).format("MMM YYYY") : "—"}
              </p>
            ) : null}
          </div>
        </div>
        {avatarError ? <p className="text-sm text-destructive">{avatarError}</p> : null}
        {uploadAvatar.isError ? (
          <p className="text-sm text-destructive">{(uploadAvatar.error as Error).message}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploadAvatar.isPending || !p.avatarDataUrl} onClick={() => uploadAvatar.mutate(null)}>
            Remove photo
          </Button>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-foreground">Activity summary</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-card px-3 py-2">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Last sign-in</dt>
              <dd className="text-sm font-medium text-foreground">
                {p.lastLoginAt ? dayjs(p.lastLoginAt).format("MMM D, YYYY h:mm A") : "—"}
              </dd>
            </div>
            <div className="rounded-lg border border-accent/25 bg-gradient-to-br from-accent/[0.1] to-card px-3 py-2">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Actions (7 days)</dt>
              <dd className="text-sm font-medium text-foreground">{weeklyCount} logged</dd>
            </div>
          </dl>
          {recentActions.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {recentActions.map((a) => (
                <li key={a.id}>
                  <span className="font-medium text-foreground">{a.action}</span>
                  {a.detail ? ` · ${a.detail}` : ""} · {dayjs(a.at).fromNow()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No recent actions recorded for your account yet.</p>
          )}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-medium text-foreground">Edit profile</h3>
        <form
          className="space-y-3"
          onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="pf-name">
              Full name
            </label>
            <Input id="pf-name" {...profileForm.register("name")} aria-invalid={Boolean(profileForm.formState.errors.name)} />
            {profileForm.formState.errors.name ? (
              <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="pf-email">
              Email
            </label>
            <Input id="pf-email" type="email" {...profileForm.register("email")} aria-invalid={Boolean(profileForm.formState.errors.email)} />
            {profileForm.formState.errors.email ? (
              <p className="text-xs text-destructive">{profileForm.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="pf-phone">
              Phone
            </label>
            <Input id="pf-phone" type="tel" {...profileForm.register("phone")} aria-invalid={Boolean(profileForm.formState.errors.phone)} />
            {profileForm.formState.errors.phone ? (
              <p className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>
            ) : null}
          </div>
          {updateProfile.isError ? (
            <p className="text-sm text-destructive">{(updateProfile.error as Error).message}</p>
          ) : null}
          <Button type="submit" disabled={updateProfile.isPending || !profileForm.formState.isDirty}>
            {updateProfile.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-medium text-foreground">Change password</h3>
        <form
          className="space-y-3"
          onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="pw-current">
              Current password
            </label>
            <Input id="pw-current" type="password" autoComplete="current-password" {...passwordForm.register("currentPassword")} />
            {passwordForm.formState.errors.currentPassword ? (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="pw-new">
              New password
            </label>
            <Input id="pw-new" type="password" autoComplete="new-password" {...passwordForm.register("newPassword")} />
            {passwordForm.formState.errors.newPassword ? (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="pw-confirm">
              Confirm new password
            </label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" {...passwordForm.register("confirmPassword")} />
            {passwordForm.formState.errors.confirmPassword ? (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>
          {changePassword.isError ? (
            <p className="text-sm text-destructive">{(changePassword.error as Error).message}</p>
          ) : null}
          {passwordToast ? <p className="text-sm text-success">Password updated.</p> : null}
          <Button type="submit" variant="secondary" disabled={changePassword.isPending || !passwordForm.formState.isDirty}>
            {changePassword.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-medium text-foreground">Notification preferences</h3>
        <p className="text-xs text-muted-foreground">These are stored locally for this demo and do not send real email.</p>
        <form
          className="space-y-3"
          onSubmit={prefsForm.handleSubmit((values) => savePrefs.mutate(values))}
        >
          {(["emailApprovals", "emailWeeklyDigest", "pushBrowser"] as const).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/80 bg-secondary/55 px-3 py-2"
            >
              <span className="text-sm text-foreground">
                {key === "emailApprovals" && "Email when timesheets need approval"}
                {key === "emailWeeklyDigest" && "Weekly digest email"}
                {key === "pushBrowser" && "In-app alerts for approvals & reminders"}
              </span>
              <input
                type="checkbox"
                className="size-4 rounded border-border text-primary accent-primary"
                checked={prefsForm.watch(key)}
                onChange={(e) => prefsForm.setValue(key, e.target.checked, { shouldDirty: true })}
              />
            </label>
          ))}
          {savePrefs.isError ? <p className="text-sm text-destructive">{(savePrefs.error as Error).message}</p> : null}
          <Button type="submit" variant="outline" disabled={savePrefs.isPending || !prefsForm.formState.isDirty}>
            {savePrefs.isPending ? "Saving…" : "Save preferences"}
          </Button>
        </form>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Session management</h3>
          <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-secondary/55 px-3 py-2">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">This device</p>
              <p className="text-muted-foreground">Session id · {device}</p>
              <p className="text-xs text-muted-foreground">Epoch {p.mockSessionEpoch} (mock counter for revoke)</p>
            </div>
          </div>
          <Button type="button" variant="outline" disabled={revokeSessions.isPending} onClick={() => revokeSessions.mutate()}>
            {revokeSessions.isPending ? "Working…" : "Log out all other devices (mock)"}
          </Button>
          {revokeSessions.isError ? (
            <p className="text-sm text-destructive">{(revokeSessions.error as Error).message}</p>
          ) : null}
        </div>
      </Card>

      {dirty ? (
        <p className="text-center text-xs text-warning">You have unsaved changes. Save or confirm before leaving.</p>
      ) : null}
    </div>
  );
}
