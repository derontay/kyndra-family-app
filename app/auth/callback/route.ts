import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth exchange error:", error.message);
    } else {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("Auth user error:", userError.message);
        } else if (userData.user) {
          const user = userData.user;
          const fullName =
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            null;

          const avatarUrl =
            (user.user_metadata?.avatar_url as string | undefined) ??
            (user.user_metadata?.picture as string | undefined) ??
            null;

          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email ?? null,
              full_name: fullName,
              avatar_url: avatarUrl,
            },
            { onConflict: "id" }
          );

          if (profileError) {
            console.error("Profile upsert error:", profileError.message);
          }
        }
      } catch (profileErr) {
        console.error("Profile upsert exception:", profileErr);
      }
    }
  }

  // important: return a response that allows cookies to be set
  return NextResponse.redirect(`${origin}/home`, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
