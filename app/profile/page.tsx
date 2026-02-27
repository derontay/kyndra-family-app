// app/profile/page.tsx
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";

async function updateProfile(formData: FormData) {
  "use server";

  const rawValue = formData.get("display_name");
  if (typeof rawValue !== "string") return;

  const displayName = rawValue.trim().slice(0, 80);
  const rawBirthday = formData.get("birthday");
  const birthday =
    typeof rawBirthday === "string" && rawBirthday.trim().length
      ? rawBirthday
      : null;

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    console.error("Profile update: missing user", userError?.message);
    return;
  }

  // Use UPSERT so it works even if the profile row doesn't exist yet
  const { error: updateError } = await supabase.from("profiles").upsert(
    {
      id: userData.user.id,
      email: userData.user.email ?? null,
      full_name: displayName.length ? displayName : null,
      birthday,
    },
    { onConflict: "id" }
  );

  if (updateError) {
    console.error("Profile update error:", updateError.message);
    return;
  }

  revalidatePath("/profile");
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Profile</h1>
        <p>You need to sign in to view your profile.</p>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, birthday")
    .eq("id", user.id)
    .maybeSingle();

  const email = profile?.email ?? user.email ?? "Unknown";
  const displayName = profile?.full_name ?? "";
  const birthday = profile?.birthday ?? "";

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Profile</h1>
      <p>Email: {email}</p>
      <p>Display name: {displayName || "Not set"}</p>
      <p>Birthday: {birthday || "Not set"}</p>

      <form action={updateProfile} style={{ marginTop: "1rem" }}>
        <label htmlFor="display_name">Update display name</label>
        <div>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={displayName}
            maxLength={80}
            style={{ marginRight: "0.5rem" }}
          />
          <button type="submit">Save</button>
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <label htmlFor="birthday">Birthday</label>
          <div>
            <input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={birthday}
              style={{ marginRight: "0.5rem" }}
            />
          </div>
        </div>
      </form>
    </main>
  );
}
