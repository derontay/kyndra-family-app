function getMonthMeta() {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const monthStart = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = monthStart.getDay();

  return {
    year,
    monthIndex,
    daysInMonth,
    startWeekday,
    label: now.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}

export default function CalendarPage() {
  const { daysInMonth, startWeekday, label } = getMonthMeta();
  const totalCells = 42;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return dayNumber;
  });

  return (
    <div className="space-y-4">
      <div className="ky-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-[var(--muted)]">Month</div>
            <div className="text-[18px] font-extrabold">{label}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="ky-btn">Prev</button>
            <button className="ky-btn ky-btn-primary">Today</button>
            <button className="ky-btn">Next</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-[12px] text-[var(--muted)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((day, index) => (
            <div
              key={`${day ?? "empty"}-${index}`}
              className={`h-12 rounded-xl border border-[var(--border)] p-2 text-[12px] ${
                day ? "bg-white/80 text-[var(--text)]" : "bg-white/40"
              }`}
            >
              {day ? <div className="font-semibold">{day}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Upcoming</div>
        <div className="mt-1 text-[18px] font-extrabold">Events</div>

        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-[var(--border)] px-3 py-2">
            <div className="text-[13px] font-semibold">No events yet</div>
            <div className="text-[12px] text-[var(--muted)]">
              Add events to see them here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
