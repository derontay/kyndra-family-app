"use client";

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/EXAMPLE_FORM_ID/viewform";

export default function FeedbackPage() {
  return (
    <div className="space-y-4">
      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Beta</div>
        <div className="mt-1 text-[20px] font-extrabold">Beta Feedback</div>
        <p className="mt-2 text-[14px] text-[var(--muted)]">
          Tell us whatâ€™s working, whatâ€™s confusing, and what you want next.
        </p>

        <div className="mt-4 space-y-2">
          <a
            className="ky-btn ky-btn-primary inline-flex w-full justify-center"
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open Feedback Form
          </a>
          <a
            className="ky-btn inline-flex w-full justify-center"
            href="mailto:feedback@kyndra.app?subject=Kyndra%20Beta%20Feedback"
          >
            Or email feedback
          </a>
        </div>
      </div>
    </div>
  );
}
