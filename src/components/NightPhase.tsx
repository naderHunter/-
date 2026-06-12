/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Player, NightState, RoleFaction, KNOWN_ROLES } from "../types";
import { Moon, Check, ArrowRight, ShieldCheck, Skull, Play, Users, Eye } from "lucide-react";

interface NightPhaseProps {
  players: Player[];
  rolesConfig: { [roleId: string]: number };
  cycleNumber: number;
  onCommitNight: (nightState: NightState) => void;
}

export default function NightPhase({ players, rolesConfig, cycleNumber, onCommitNight }: NightPhaseProps) {
  const [nightActions, setNightActions] = useState<NightState>({
    mafiaTarget: null,
    doctorSave: null,
    detectiveInquiry: null,
    detectiveResult: null,
    lecterSave: null,
    sniperTarget: null,
    psychologistMute: null,
    diehardInquiry: false,
  });

  // Calculate which steps are actually in the game
  const hasRole = (roleId: string) => (rolesConfig[roleId] || 0) > 0;

  // Let's build a static list of night steps in the correct wake order
  const stepsPool = [
    {
      id: "intro",
      title: "شب معارفه (تایید مافیا)",
      description: "همه چشم‌ها بسته. تیم مافیا بیدار می‌شود و همدیگر را شناسایی می‌کند. برای بازی شب اول الزامی است.",
      roleRequired: "godfather", // Godfather/Simple Mafia exists
      onlyNightOne: true,
      actionKey: null,
    },
    {
      id: "mafia",
      title: "۱. شلیک مافیا (پدرخوانده)",
      description: "تیم مافیا بیدار می‌شود. تصمیم شلیک نهایی توسط رئیس (پدرخوانده) گرفته شده و هدف را انتخاب کنید:",
      roleRequired: "godfather",
      onlyNightOne: false,
      actionKey: "mafiaTarget",
    },
    {
      id: "doctor",
      title: "۲. شیوای نجات دکتر",
      description: "دکتر بیدار می‌شود. شخصی را برای نجات یافتن از مرگ انتخاب کنید (محدودیت خودنجاتی دارد):",
      roleRequired: "doctor",
      onlyNightOne: false,
      actionKey: "doctorSave",
    },
    {
      id: "detective",
      title: "۳. استعلام کارآگاه",
      description: "کارآگاه بیدار می‌شود. بازیکنی را بپرسید؛ سیستم ائتلافی او را به مابین مافیا و شهروند مشخص می‌کند:",
      roleRequired: "detective",
      onlyNightOne: false,
      actionKey: "detectiveInquiry",
    },
    {
      id: "lecter",
      title: "۴. جراحی جراح (دکتر لکتر)",
      description: "دکتر لکتر بیدار می‌شود. بازیکنی از هم تیمی‌های مافیا را برای فرار از شلیک تک‌تیرانداز نجات دهید:",
      roleRequired: "lecter",
      onlyNightOne: false,
      actionKey: "lecterSave",
    },
    {
      id: "sniper",
      title: "۵. شلیک تک‌تیرانداز (حرفه‌ای)",
      description: "تیک‌تیرانداز بیدار می‌شود. آیا او شلیک می‌کند؟ اگر بله، هدف شلیک انتخابی را کلیک کنید:",
      roleRequired: "sniper",
      onlyNightOne: false,
      actionKey: "sniperTarget",
    },
    {
      id: "psychologist",
      title: "۶. سکوت روان‌پزشک",
      description: "روان‌پزشک بیدار می‌شود. یک نفر را که برای فردا حق صحبت در کلاس ندارد لال (ساکت) کنید:",
      roleRequired: "psychologist",
      onlyNightOne: false,
      actionKey: "psychologistMute",
    },
    {
      id: "diehard",
      title: "۷. استعلام جان‌سخت",
      description: "جان‌سخت بیدار می‌شود. آیا او تقاضای استعلام نقش‌های خارج شده بازی را ثبت می‌کند؟",
      roleRequired: "diehard",
      onlyNightOne: false,
      actionKey: "diehardInquiry",
    },
  ];

  // Filter steps that are relevant for the current configurations
  const steps = stepsPool.filter((step) => {
    // Check if role is in play
    if (step.roleRequired && !hasRole(step.roleRequired)) return false;
    // Check night range
    if (step.onlyNightOne && cycleNumber > 1) return false;
    if (step.id === "mafia" && cycleNumber === 1 && hasRole("godfather")) {
      // In night 1, usually there's no shoot inside many Iranian scenarios if we have intro, or intro serves instead
      // Vigiato says: Night 1 is Night of Introduction, NO shoots. So if cycleNumber is 1, skip shoot steps!
      return false;
    }
    // Same for others
    if (cycleNumber === 1 && step.id !== "intro") {
      // Waking up other roles on night 1 is NOT required except for Intro step.
      return false;
    }
    return true;
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const activeStep = steps[currentStepIndex];

  // If there are no steps for this combination (should not happen, but safeguard)
  if (!activeStep) {
    return (
      <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300">
        خطای پیکربندی مراحل شب. لطفاً دکمه پایان را فشار دهید.
        <button
          onClick={() => onCommitNight(nightActions)}
          className="mt-4 block mx-auto bg-red-600 px-6 py-2 rounded-lg"
        >
          ورود به فاز روز
        </button>
      </div>
    );
  }

  // Active alive players list for selection
  const alivePlayers = players.filter((p) => p.isAlive);

  const handleSelectPlayer = (playerId: string) => {
    if (!activeStep.actionKey) return;

    if (activeStep.id === "detective") {
      // Fetch role and calculate inquiry result
      const targetPlayer = players.find((p) => p.id === playerId);
      let result: "MAFIA" | "CITIZEN" = "CITIZEN";
      if (targetPlayer && targetPlayer.roleId) {
        const role = KNOWN_ROLES.find((r) => r.id === targetPlayer.roleId);
        // Godfather is returns white (Citizen). Dr Lecter, simple mafia, negotiator return Mafia.
        if (role && role.faction === RoleFaction.MAFIA && role.id !== "godfather") {
          result = "MAFIA";
        }
      }
      setNightActions({
        ...nightActions,
        detectiveInquiry: playerId,
        detectiveResult: result,
      });
    } else {
      // Toggle or set
      const currentVal = nightActions[activeStep.actionKey as keyof NightState];
      const nextVal = currentVal === playerId ? null : playerId; // Toggle support
      setNightActions({
        ...nightActions,
        [activeStep.actionKey]: nextVal,
      });
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex + 1 < steps.length) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Completed last step of night, submit Actions to main motor
      onCommitNight(nightActions);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const getSelectedPlayerName = (pId: string | null) => {
    if (!pId) return "ہیچ فردی انتخاب نشده";
    return players.find((p) => p.id === pId)?.name || "ناشناس";
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-6 dir-rtl text-right" style={{ direction: "rtl" }}>
      {/* Night header panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <Moon className="w-8 h-8 text-indigo-400 animate-pulse" />
          <div>
            <h2 className="text-xl font-bold font-sans text-slate-100">راهبری شبانه بازی (شب {cycleNumber})</h2>
            <p className="text-xs text-slate-400">به عنوان گرداننده، نقش‌ها را بیدار کنید و انتخاب‌های آن‌ها را دانه بدانه کلیک کنید.</p>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-900/40 p-1 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
          <span>مرحله {currentStepIndex + 1} از {steps.length}</span>
        </div>
      </div>

      {/* Main wake flow board */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <span className="text-[10px] bg-indigo-950 border border-indigo-900 text-indigo-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-widest block w-fit">
            بیدارباش فعال
          </span>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            {activeStep.title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">{activeStep.description}</p>
        </div>

        {/* Input selection area */}
        {activeStep.actionKey ? (
          <div className="space-y-4">
            {activeStep.id === "sniper" && (
              <div className="flex items-center gap-2 pb-2">
                <span className="text-xs bg-slate-800 text-slate-300 py-1.5 px-4 rounded-xl border border-slate-700 block text-right">
                  آیا تک‌تیرانداز قصد شلیک در این شب دارد؟
                </span>
                <button
                  onClick={() => setNightActions({ ...nightActions, sniperTarget: nightActions.sniperTarget ? null : "SKIP" })}
                  className={`text-xs px-4 py-1.5 rounded-xl border transition ${
                    nightActions.sniperTarget === null || nightActions.sniperTarget === "SKIP"
                      ? "bg-red-950 border-red-500/30 text-red-400 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {nightActions.sniperTarget === "SKIP" || nightActions.sniperTarget === null ? "خیر (بدون شلیک)" : "دوباره غایب کردن"}
                </button>
              </div>
            )}

            {activeStep.id === "diehard" ? (
              <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl text-center space-y-4 max-w-sm mx-auto">
                <span className="text-xs text-slate-400 block font-semibold">انتخاب کن کار یا تفنگ؟</span>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setNightActions({ ...nightActions, diehardInquiry: true })}
                    className={`py-3 px-6 rounded-xl font-bold text-xs border transition ${
                      nightActions.diehardInquiry
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850"
                    }`}
                  >
                    بله، استعلام خواست
                  </button>
                  <button
                    onClick={() => setNightActions({ ...nightActions, diehardInquiry: false })}
                    className={`py-3 px-6 rounded-xl font-bold text-xs border transition ${
                      !nightActions.diehardInquiry
                        ? "bg-red-650 border-red-500 text-white shadow-lg"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850"
                    }`}
                  >
                    خیر، استعلام نکرد
                  </button>
                </div>
              </div>
            ) : (
              // General Grid list of players for selection
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 font-bold block">یکی از کاندیداها را کلیک کنید:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {alivePlayers
                    .filter(p => {
                      // Dr. Lecter can only heal other Mafia of sniper shot, but Doctor heals anyone
                      // Prevent selecting invalid targets if needed, but keeping it flexible is safer.
                      return true;
                    })
                    .map((player) => {
                      const isSelected = nightActions[activeStep.actionKey as keyof NightState] === player.id;
                      return (
                        <button
                          key={player.id}
                          onClick={() => handleSelectPlayer(player.id)}
                          className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 h-20 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400/20 scale-102"
                              : "bg-slate-950 border-slate-800 hover:border-slate-705 text-slate-350 hover:bg-slate-850"
                          }`}
                        >
                          <span className="font-bold text-sm tracking-wide block truncate w-full">{player.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Special output display for Detective Inquiry */}
            {activeStep.id === "detective" && nightActions.detectiveInquiry && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between max-w-md mx-auto animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">هدف استعلام:</span>
                  <span className="text-sm text-indigo-400 font-extrabold">{getSelectedPlayerName(nightActions.detectiveInquiry)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold pl-2">نتیجه استعلام برای شما:</span>
                  {nightActions.detectiveResult === "MAFIA" ? (
                    <span className="text-xs bg-red-900/40 text-red-400 border border-red-900 px-3 py-1 rounded inline-flex items-center gap-1 font-bold">
                      <Skull className="w-3.5 h-3.5" />
                      مثبت (مافیا)
                    </span>
                  ) : (
                    <span className="text-xs bg-green-900/40 text-green-400 border border-green-900 px-3 py-1 rounded inline-flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      منفی (شهروند)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Introduction summary if intro step
          <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center space-y-4 max-w-md mx-auto">
            <Users className="w-12 h-12 text-indigo-400 mx-auto" />
            <h4 className="font-bold text-slate-200">معارفه و انسجام تیمی</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              در معارفه شب اول، به مافیاها اجازه دهید چشم باز کنند، همدیگر را بشناسند و دکتر لکتر و پدرخوانده هماهنگ شوند. سایر نقش‌ها هم بیدار می‌شوند تا حضور خود را به شما اعلام کنند. شلیکی صورت نمی‌گیرد.
            </p>
          </div>
        )}
      </div>

      {/* Button footer controls */}
      <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
        <button
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            currentStepIndex === 0
              ? "text-slate-600 bg-transparent cursor-not-allowed"
              : "text-slate-300 hover:text-white bg-slate-800"
          }`}
        >
          مرحله قبل
        </button>

        <button
          onClick={handleNextStep}
          className="bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-bold text-xs py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-indigo-900/20 cursor-pointer active:scale-95 transition"
        >
          {currentStepIndex + 1 === steps.length ? (
            <>
              پایان شب و طلوع روز
              <Play className="w-4 h-4 fill-white" />
            </>
          ) : (
            <>
              مرحله بعد
              <ArrowRight className="w-4 h-4 rotate-180" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
