import { useEffect, useState } from "react";
import { LogIn, LogOut as LogOutIcon, Home } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { useAuth } from "../context/AuthContext";
import { minutesToLabel } from "../data/attendance";
import { Badge } from "./Badge";
import { Button } from "./Button";

// Office hours are in India time; read the clock there so the check-in
// window matches what the server enforces wherever the browser is.
function nowIST() {
  const d = new Date();
  const [h, m] = d
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .split(":")
    .map(Number);
  const weekday = new Date(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z").getUTCDay();
  return { minutes: h * 60 + m, weekday };
}

export function AttendanceWidget({ record, onCheckIn, onCheckOut, onWFH }) {
  const { settings } = useHRData();
  const { currentUser } = useAuth();
  const [now, setNow] = useState(nowIST);
  const [error, setError] = useState(null);

  // Re-check every 30s so the buttons unlock at opening time without a reload.
  useEffect(() => {
    const id = setInterval(() => setNow(nowIST()), 30_000);
    return () => clearInterval(id);
  }, []);

  const opensAt = settings.checkInByMinutes - (settings.checkInOpensMinutesBefore ?? 45);
  // Test accounts aren't held to the window, mirroring the server.
  const exempt = Boolean(currentUser?.policyExempt);
  const weeklyOff = !exempt && (settings.weeklyOffDays ?? [0, 6]).includes(now.weekday);
  const tooEarly = !exempt && now.minutes < opensAt;
  const tooLate = !exempt && now.minutes >= settings.checkOutFromMinutes;
  const closed = weeklyOff || tooEarly || tooLate;

  async function run(action) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!record) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {weeklyOff
              ? "Today is a weekly holiday — no attendance to mark."
              : tooLate
              ? `Check-in is closed — office hours ended at ${minutesToLabel(settings.checkOutFromMinutes)}.`
              : tooEarly
              ? `Check-in opens at ${minutesToLabel(opensAt)} — office starts at ${minutesToLabel(settings.checkInByMinutes)}.`
              : "You haven't checked in yet today."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => run(onWFH)} disabled={closed}>
              <Home className="h-4 w-4" /> Mark WFH
            </Button>
            <Button onClick={() => run(onCheckIn)} disabled={closed}>
              <LogIn className="h-4 w-4" /> Check In
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Badge>{record.status}</Badge>
        <p className="text-sm text-muted-foreground">
          In at <span className="font-medium text-foreground">{record.checkIn}</span>
          {record.checkOut && (
            <>
              {" "}
              · Out at <span className="font-medium text-foreground">{record.checkOut}</span>
            </>
          )}
        </p>
      </div>
      {!record.checkOut && (
        <Button variant="outline" onClick={() => run(onCheckOut)}>
          <LogOutIcon className="h-4 w-4" /> Check Out
        </Button>
      )}
    </div>
  );
}
