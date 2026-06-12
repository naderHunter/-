/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEvent } from "../types";
import { ListCollapse, ChevronRight, Moon, Sunrise, VolumeX } from "lucide-react";

interface EventTimelineProps {
  events: GameEvent[];
  onClearLogs?: () => void;
}

export default function EventTimeline({ events, onClearLogs }: EventTimelineProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 max-h-[85vh] overflow-y-auto shadow-2xl space-y-4 dir-rtl" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ListCollapse className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-bold text-slate-100">تاریخچه وقایع مسابقه (سند بازی)</h3>
        </div>
        {onClearLogs && (
          <button
            onClick={onClearLogs}
            className="text-[10px] text-slate-500 hover:text-red-400 font-bold transition"
          >
            پاک کردن کل لاگ‌ها
          </button>
        )}
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            هنوز رویدادی ثبت نشده است. با شروع شب‌ها و روزها اطلاعات ائتلافی در اینجا لیست خواهد شد.
          </div>
        ) : (
          <div className="relative border-r border-slate-800/80 mr-3 pr-4 space-y-4 py-1.5">
            {events.slice().reverse().map((event) => {
              // Custom icon based on event type
              const getIcon = () => {
                if (event.phase === "NIGHT") {
                  return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
                }
                if (event.phase === "DAY") {
                  return <Sunrise className="w-3.5 h-3.5 text-amber-500" />;
                }
                return <ChevronRight className="w-3.5 h-3.5 text-slate-400" />;
              };

              const getBadgeColor = () => {
                switch (event.type) {
                  case "DEATH":
                    return "bg-red-950/40 border-red-900 text-red-400";
                  case "INQUIRY":
                    return "bg-indigo-950/40 border-indigo-900 text-indigo-400";
                  case "MUTE":
                    return "bg-blue-950/40 border-blue-900 text-blue-400";
                  case "WARNING":
                    return "bg-amber-950/40 border-amber-900 text-amber-500";
                  case "VOTE":
                    return "bg-pink-950/40 border-pink-900 text-pink-400";
                  case "GAME_OVER":
                    return "bg-emerald-950/45 border-emerald-900 text-emerald-400";
                  default:
                    return "bg-slate-950/40 border-slate-800 text-slate-400";
                }
              };

              return (
                <div key={event.id} className="relative group animate-fade-in text-right">
                  {/* Timeline dot */}
                  <div className="absolute top-1.5 -right-[23.5px] w-4 h-4 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                    {getIcon()}
                  </div>

                  <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-3 space-y-1.5 hover:bg-slate-950/70 transition">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] uppercase font-bold border rounded-full px-2 py-0.5 tracking-wider ${getBadgeColor()}`}>
                        {event.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {event.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                      {event.description}
                    </p>

                    {event.details && (
                      <div className="text-[10px] bg-slate-900 text-slate-450 p-2 rounded border border-slate-850 font-sans">
                        {event.details}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
