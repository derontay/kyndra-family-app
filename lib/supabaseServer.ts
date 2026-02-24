import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createClient() {
  // Next 16 dynamic API can be sync or async depending on runtime.
  const cookieStore = await resolveCookieStore();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return readAllCookies(cookieStore);
        },

        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookieStore.set === "function") {
                cookieStore.set(name, value, options);
                return;
              }

              if (typeof cookieStore.setAll === "function") {
                cookieStore.setAll([{ name, value, options }]);
              }
            });
          } catch {
            // Ignore - Server Components cannot set cookies, but Route Handlers can.
          }
        },
      },
    }
  );
}

async function resolveCookieStore() {
  const maybeStore = cookies() as any;
  if (maybeStore && typeof maybeStore.then === "function") {
    return await maybeStore;
  }
  return maybeStore;
}

function readAllCookies(cookieStore: any): { name: string; value: string }[] {
  if (!cookieStore) return [];

  if (typeof cookieStore.getAll === "function") {
    return cookieStore.getAll();
  }

  if (typeof cookieStore[Symbol.iterator] === "function") {
    return Array.from(cookieStore);
  }

  // Fallback: no bulk access available
  return [];
}
