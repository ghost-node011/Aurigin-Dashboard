import { LogIn, LogOut as LogOutIcon, Home } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";

export function AttendanceWidget({ record, onCheckIn, onCheckOut, onWFH }) {
  if (!record) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">You haven't checked in yet today.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onWFH}>
            <Home className="h-4 w-4" /> Mark WFH
          </Button>
          <Button onClick={onCheckIn}>
            <LogIn className="h-4 w-4" /> Check In
          </Button>
        </div>
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
        <Button variant="outline" onClick={onCheckOut}>
          <LogOutIcon className="h-4 w-4" /> Check Out
        </Button>
      )}
    </div>
  );
}
