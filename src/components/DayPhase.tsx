/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Player, LastMoveCard, LAST_MOVE_CARDS, RoleFaction, KNOWN_ROLES } from "../types";
import { Sunrise, Volume2, VolumeX, AlertTriangle, ShieldCheck, HelpCircle, Vote, Crown, Play, Pause, RotateCcw, Timer, RefreshCw, LogOut, Award, HelpCircle as Help } from "lucide-react";
import { playTimerTick, playTimerWarning } from "../utils/audio";

interface DayPhaseProps {
  players: Player[];
  cycleNumber: number;
  warningsLimit: number; // e.g., 3 or 4
  recentNightCasualties: string[]; // List of player names killed last night
  recentlyMutedPlayerId: string | null;
  onCommitDayExile: (exiledPlayerId: string | null, cardDrawn?: string | null) => void;
  onUpdatePlayerStatus: (updatedPlayers: Player[]) => void;
  onTriggerDiehardInquiryOutput: () => void;
  showInquiryResults: boolean;
  inquiryResultsList: string[]; // List of roles eliminated
}

export default function DayPhase({
  players,
  cycleNumber,
  warningsLimit = 3,
  recentNightCasualties,
  recentlyMutedPlayerId,
  onCommitDayExile,
  onUpdatePlayerStatus,
  onTriggerDiehardInquiryOutput,
  showInquiryResults,
  inquiryResultsList,
}: DayPhaseProps) {
  const [activeSpeechPlayerId, setActiveSpeechPlayerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30); // Default speech time 30s
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [isAlertTime, setIsAlertTime] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Voting and Nomination states
  const [isVotingMode, setIsVotingMode] = useState<boolean>(false);
  const [playerNominationVotes, setPlayerNominationVotes] = useState<{ [playerId: string]: number }>({});
  const [trialNominees, setTrialNominees] = useState<Player[]>([]);

  // Trial Mode states
  const [isTrialMode, setIsTrialMode] = useState<boolean>(false);
  const [selectedMayorDecision, setSelectedMayorDecision] = useState<"NONE" | "VETO" | "EXILE">("NONE");
  const [mayorSelectedExileTargetId, setMayorSelectedExileTargetId] = useState<string | null>(null);
  const [votedOutPlayerId, setVotedOutPlayerId] = useState<string | null>(null);

  // Last Move Card state
  const [isLastMoveCardMode, setIsLastMoveCardMode] = useState<boolean>(false);
  const [drawnCard, setDrawnCard] = useState<LastMoveCard | null>(null);

  const alivePlayers = players.filter((p) => p.isAlive);

  // Manage speaking timer
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      if (timeLeft <= 5) {
        setIsAlertTime(true);
        playTimerWarning();
      } else {
        setIsAlertTime(false);
        playTimerTick();
      }
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      setIsAlertTime(false);
      playTimerWarning(); // Final alarm chime
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, timerRunning]);

  // Start speaker timer
  const handleStartTimer = (playerId: string) => {
    setActiveSpeechPlayerId(playerId);
    setTimeLeft(35); // 35 seconds is standard speaker turn
    setTimerRunning(true);
    setIsAlertTime(false);
  };

  const handleTogglePause = () => {
    setTimerRunning(!timerRunning);
  };

  const handleResetTimer = () => {
    setTimeLeft(35);
    setTimerRunning(false);
    setIsAlertTime(false);
  };

  const handleAddChallengeTime = () => {
    setTimeLeft((prev) => prev + 15);
  };

  // Warning modifiers (کارت زرد و قرمز اخطار انضباطی)
  const handleIncrementWarning = (playerId: string) => {
    const nextPlayers = players.map((p) => {
      if (p.id === playerId) {
        const nextWarn = p.warnings + 1;
        // On warningLimit (e.g., 3 or 4), we should prompt to kick them or auto-kick them
        return {
          ...p,
          warnings: nextWarn,
          isAlive: nextWarn >= warningsLimit ? false : p.isAlive, // Kick on limit if we choose
        };
      }
      return p;
    });
    onUpdatePlayerStatus(nextPlayers);
  };

  const handleDecrementWarning = (playerId: string) => {
    const nextPlayers = players.map((p) => {
      if (p.id === playerId) {
        return { ...p, warnings: Math.max(0, p.warnings - 1) };
      }
      return p;
    });
    onUpdatePlayerStatus(nextPlayers);
  };

  // Handle player discipline kick manually
  const handleDirectDisciplineKick = (playerId: string) => {
    const confirmKick = window.confirm("آیا حتماً می‌خواهید این بازیکن را اخراج انضباطی کنید؟");
    if (confirmKick) {
      const nextPlayers = players.map((p) => {
        if (p.id === playerId) {
          return { ...p, isAlive: false };
        }
        return p;
      });
      onUpdatePlayerStatus(nextPlayers);
    }
  };

  // Manage Nominations / Voting Phase
  const handleVoteChange = (playerId: string, val: number) => {
    setPlayerNominationVotes({
      ...playerNominationVotes,
      [playerId]: Math.max(0, val),
    });
  };

  const handleCalculateTrialNominees = () => {
    // Standard rule: Nominees must get at least half of the currently alive players' votes, or a lower minimum e.g., 4 or 5
    // Let's list nominees who received >= half of the alive players count. Or any player with at least 3 votes for flexibility
    // Let's set the threshold to: Math.max(3, Math.floor(alivePlayers.length / 2)) for a classic rule, but keeping it flexible.
    const threshold = Math.max(2, Math.floor(alivePlayers.length / 2));
    const nominees = alivePlayers.filter((p) => {
      const votes = playerNominationVotes[p.id] || 0;
      return votes >= threshold;
    });

    if (nominees.length === 0) {
      alert(`کسی به حد نصاب کاندیداتوری (${threshold} رای) نرسید! رای‌گیری تمدید یا عبور شد.`);
      return;
    }

    setTrialNominees(nominees);
    setIsTrialMode(true);
    setIsVotingMode(false);
  };

  // Process Trial Exit decision
  const handleExileProcess = (targetId: string | null) => {
    if (!targetId) {
      // No one exiled
      onCommitDayExile(null);
      return;
    }

    // If exiled, does a Last Move Card exist?
    // In Iran, excluded players draw a Last Move Card to invoke. Let's redirect to card simulator first
    setVotedOutPlayerId(targetId);
    setIsLastMoveCardMode(true);
  };

  const handleDrawLastMoveCard = () => {
    // Pick a card randomly
    const randomCard = LAST_MOVE_CARDS[Math.floor(Math.random() * LAST_MOVE_CARDS.length)];
    setDrawnCard(randomCard);
  };

  const handleConfirmExileWithCard = () => {
    onCommitDayExile(votedOutPlayerId, drawnCard?.id);

    // Reset trial elements
    setVotedOutPlayerId(null);
    setDrawnCard(null);
    setIsLastMoveCardMode(false);
    setIsTrialMode(false);
    setSelectedMayorDecision("NONE");
    setMayorSelectedExileTargetId(null);
    setTrialNominees([]);
    setPlayerNominationVotes({});
  };

  const handleSkipTrial = () => {
    setIsTrialMode(false);
    setSelectedMayorDecision("NONE");
    setMayorSelectedExileTargetId(null);
    setTrialNominees([]);
    setPlayerNominationVotes({});
  };

  // Mayor direct decision logic
  const handleMayorDirectCommit = () => {
    if (selectedMayorDecision === "VETO") {
      // Veto cancels the vote completely
      onCommitDayExile(null);
      setIsTrialMode(false);
    } else if (selectedMayorDecision === "EXILE" && mayorSelectedExileTargetId) {
      // Directly exiles the selected target
      handleExileProcess(mayorSelectedExileTargetId);
    }
  };

  // Check if Mayor is alive in players
  const isMayorAlive = alivePlayers.some((p) => p.roleId === "mayor");

  return (
    <div className="space-y-6 dir-rtl text-right" style={{ direction: "rtl" }}>
      {/* 1. Morning News Briefing Banner */}
      <div className="bg-gradient-to-r from-amber-600/10 to-orange-500/10 border border-amber-900/30 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sunrise className="w-8 h-8 text-amber-500" />
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-sans">وقایع فجر و طلوع آفتاب (روز {cycleNumber})</h2>
            <div className="mt-1 text-xs text-slate-350 space-y-1">
              <div>
                قربانیان کشته‌شده شب قبل:{" "}
                {recentNightCasualties.length === 0 ? (
                  <span className="text-green-400 font-bold">دیشب کشته نداشتیم مرسی از دکتر!</span>
                ) : (
                  <span className="text-red-400 font-bold pr-1">{recentNightCasualties.join(" و ")} از بازی خارج شدند.</span>
                )}
              </div>
              {recentlyMutedPlayerId && (
                <div>
                  ممنوع‌الکلام امروز:{" "}
                  <span className="text-indigo-400 font-bold">
                    {players.find((p) => p.id === recentlyMutedPlayerId)?.name} توسط روان‌پزشک لال شده است.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diehard Inquiry Actions for daytime */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={onTriggerDiehardInquiryOutput}
            className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-xl transition font-bold"
          >
            📊 استعلام استخوان‌ها (جان‌سخت)
          </button>
        </div>
      </div>

      {/* Diehard Inquiry outputs if triggered */}
      {showInquiryResults && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 animate-fade-in text-xs max-w-lg">
          <span className="font-bold text-amber-500 block mb-1">نتیجه استعلام اعضای خارج شده از بازی:</span>
          {inquiryResultsList.length === 0 ? (
            <span className="text-slate-400">تاکنون نقشی از بازی خارج نشده، یا استعلام نقشی داده نشده است.</span>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {inquiryResultsList.map((roleId, i) => {
                const role = KNOWN_ROLES.find((r) => r.id === roleId);
                return (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold ${
                      role?.faction === RoleFaction.MAFIA ? "bg-red-950/40 border-red-900 text-red-400" : "bg-blue-950/40 border-blue-900 text-blue-400"
                    }`}
                  >
                    {role?.name || roleId}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Core Active Players Talking and Warns Grid */}
      {!isTrialMode && !isLastMoveCardMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              تکلم انفرادی و کنترل بازیکنان فعال ({alivePlayers.length} نفر زنده)
            </h3>

            <button
              onClick={() => setIsVotingMode(!isVotingMode)}
              className={`text-xs px-4 py-2 rounded-xl border flex items-center gap-1.5 transition font-bold ${
                isVotingMode
                  ? "bg-amber-500 border-amber-400 text-slate-950"
                  : "bg-slate-950 border-slate-800 text-amber-500 hover:bg-slate-850"
              }`}
            >
              <Vote className="w-4 h-4" />
              {isVotingMode ? "اتمام ثبت آرا" : "ورکت در رای‌گیری روز"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alivePlayers.map((player) => {
              const isSpeaker = activeSpeechPlayerId === player.id;
              const isMuted = player.id === recentlyMutedPlayerId || player.isMuted;
              return (
                <div
                  key={player.id}
                  className={`border rounded-2xl p-4 transition-all flex flex-col justify-between h-40 ${
                    isSpeaker
                      ? "bg-amber-950/20 border-amber-500 shadow-lg shadow-amber-500/5"
                      : "bg-slate-950/50 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-200 text-sm block tracking-wide">{player.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        نقش مخفی: {KNOWN_ROLES.find((r) => r.id === player.roleId)?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 py-0.5 px-2 rounded-full">
                      <AlertTriangle className={`w-3.5 h-3.5 ${player.warnings > 1 ? "text-red-500" : "text-amber-500"}`} />
                      <span className="text-[10px] font-bold text-slate-300">اخطار: {player.warnings}/{warningsLimit}</span>
                    </div>
                  </div>

                  {/* Increments / Decrements Warning Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => handleDecrementWarning(player.id)}
                        className="w-6 h-6 hover:bg-slate-800 text-slate-400 rounded flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs text-slate-300 w-4 text-center font-mono">{player.warnings}</span>
                      <button
                        onClick={() => handleIncrementWarning(player.id)}
                        className="w-6 h-6 hover:bg-slate-800 text-slate-400 rounded flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleDirectDisciplineKick(player.id)}
                      className="text-[10px] text-red-500 hover:text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 px-2 py-1 rounded transition ml-auto"
                    >
                      اخراج مستقیم
                    </button>
                  </div>

                  {/* Talk Trigger Buttons or Voting Inputs if VotingMode is active */}
                  <div className="border-t border-slate-900/60 pt-2.5 mt-2.5">
                    {isVotingMode ? (
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span>آرای ماخوذه مقدماتی:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={playerNominationVotes[player.id] || 0}
                            onChange={(e) => handleVoteChange(player.id, parseInt(e.target.value) || 0)}
                            className="w-12 bg-slate-900 text-center border border-slate-800 text-amber-500 font-bold font-mono py-1 rounded"
                          />
                          <span>رای</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        {isMuted ? (
                          <span className="text-[10px] bg-red-950 border border-red-900/30 text-red-400 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <VolumeX className="w-3 h-3" />
                            ساکت شده (ممنوع الصدا)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartTimer(player.id)}
                            className={`text-xs py-1 px-4 rounded-xl border flex items-center gap-1.5 transition ${
                              isSpeaker
                                ? "bg-amber-500 border-amber-400 text-slate-950 font-bold"
                                : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            {isSpeaker ? "سخنرانی فعال..." : "استارت تایمر کلام"}
                          </button>
                        )}

                        {isSpeaker && (
                          <span className={`text-sm font-extrabold font-mono ${isAlertTime ? "text-red-500 animate-pulse scale-110" : "text-amber-500"}`}>
                            {timeLeft} ثانیه
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Floating Timer Controller at bottom of active speaking */}
          {activeSpeechPlayerId && (
            <div className="bg-slate-950 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in shadow-inner">
              <div className="flex items-center gap-2.5">
                <Timer className="w-5 h-5 text-amber-500" />
                <span className="text-xs text-slate-400">تایمر سخنرانی:</span>
                <span className="text-sm text-slate-200 font-bold">
                  {players.find((p) => p.id === activeSpeechPlayerId)?.name}
                </span>
                <span className={`text-base font-bold font-mono px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg ${isAlertTime ? "text-red-400 animate-pulse" : "text-amber-500"}`}>
                  {timeLeft} ثانیه
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleTogglePause}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 p-2 rounded-xl transition flex items-center gap-1"
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {timerRunning ? "توقف" : "ادامه"}
                </button>
                <button
                  onClick={handleResetTimer}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 p-2 rounded-xl transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ریست
                </button>
                <button
                  onClick={handleAddChallengeTime}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold p-2 px-3 rounded-xl transition flex items-center gap-1"
                >
                  +۱۵ ثانیه کلام چالش
                </button>
                <button
                  onClick={() => {
                    setActiveSpeechPlayerId(null);
                    setTimerRunning(false);
                  }}
                  className="text-slate-500 hover:text-slate-300 p-2 pr-4 transition"
                >
                  بستن پنل تایمر
                </button>
              </div>
            </div>
          )}

          {/* Action to proceed to Trial after Nomination numbers are populated */}
          {isVotingMode && (
            <div className="flex justify-end pt-3">
              <button
                onClick={handleCalculateTrialNominees}
                className="bg-gradient-to-r from-red-650 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-extrabold text-xs py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                ارسال متهمین به دادگاه
                <Vote className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Trial Stage Layout Panel (دادگاه خروج) */}
      {isTrialMode && !isLastMoveCardMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <h3 className="text-base font-extrabold text-red-500 flex items-center gap-2">
              <Vote className="w-5 h-5" />
              صحنه محاکمه دادگاه نهایی
            </h3>
            <span className="text-[10px] bg-red-950 border border-red-900/30 text-red-400 font-bold px-3 py-1 rounded-full">
              {trialNominees.length} متهم راه یافته
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            در این فاز متهمین مجالی برای استدلال دفاعی دارند. سپس می‌توانید با رای‌گیری خروج نهایی یا اختیارات شهردار زنده جریان بازی را هدایت کنید.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trialNominees.map((nominee) => (
              <div key={nominee.id} className="bg-slate-950 border border-red-900/10 rounded-2xl p-4 flex flex-col justify-between h-32 hover:border-red-900/40 transition">
                <div>
                  <span className="font-extrabold text-slate-200 text-sm block">{nominee.name}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                    نقش واقعی: {KNOWN_ROLES.find((r) => r.id === nominee.roleId)?.name}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartTimer(nominee.id)}
                    className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] py-1.5 px-3 rounded-lg text-slate-350 transition flex items-center justify-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    دفاعیه (تایمر ۳۵ ثانیه)
                  </button>

                  <button
                    onClick={() => handleExileProcess(nominee.id)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-[10px] py-1.5 px-2 rounded-lg transition text-center shadow"
                  >
                    رای‌گیری خروج مستقیم
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Mayor veto / judgement tools if living */}
          {isMayorAlive && (
            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl space-y-4">
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" />
                امکان تصمیم‌گیری ویژه و حکم شهردار (زنده)
              </span>

              <div className="flex flex-wrap gap-2.5 text-xs">
                <button
                  onClick={() => setSelectedMayorDecision("VETO")}
                  className={`py-2 px-4 rounded-xl border font-bold transition ${
                    selectedMayorDecision === "VETO"
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850"
                  }`}
                >
                  وتوی کل دادگاه (هیچکس خارج نشود)
                </button>

                <button
                  onClick={() => setSelectedMayorDecision("EXILE")}
                  className={`py-2 px-4 rounded-xl border font-bold transition ${
                    selectedMayorDecision === "EXILE"
                      ? "bg-red-650 border-red-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850"
                  }`}
                >
                  اخراج مستقیم یک شخص (حق تصمیم مستقیم شهردار)
                </button>
              </div>

              {selectedMayorDecision === "EXILE" && (
                <div className="space-y-2 pt-2 animate-fade-in">
                  <span className="text-[10px] text-slate-400 block font-semibold">پای فرد اخراجی به حکم شهردار را مشخص کنید:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {trialNominees.map((nominee) => (
                      <button
                        key={nominee.id}
                        onClick={() => setMayorSelectedExileTargetId(nominee.id)}
                        className={`text-xs px-3.5 py-1.5 rounded-lg border transition font-medium ${
                          mayorSelectedExileTargetId === nominee.id
                            ? "bg-red-600/20 border-red-500 text-red-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        {nominee.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-900">
                <button
                  onClick={handleMayorDirectCommit}
                  disabled={selectedMayorDecision === "NONE" || (selectedMayorDecision === "EXILE" && !mayorSelectedExileTargetId)}
                  className="bg-amber-500 text-slate-950 opacity-90 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold py-2 px-5 rounded-lg transition flex items-center gap-1"
                >
                  ثبت حکم کتبی شهردار
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-4">
            <button
              onClick={handleSkipTrial}
              className="text-slate-400 hover:text-slate-200"
            >
              خط بر بطلان کل رای‌گیری (عبور روز بدون خروجی)
            </button>
          </div>
        </div>
      )}

      {/* 5. Voted Out Player Last Move Card simulator */}
      {isLastMoveCardMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 max-w-xl mx-auto animate-fade-in">
          <div className="space-y-2 border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-200 flex items-center justify-center gap-1.5">
              <Award className="w-5 h-5 text-amber-500" />
              کارت حرکت آخر بازیکن اخراج شده
            </h3>
            <span className="text-xs text-slate-400 block pr-1 leading-relaxed">
              بازیکن خروجی یعنی <span className="text-amber-500 font-bold">{players.find((p) => p.id === votedOutPlayerId)?.name}</span> حق استفاده از یک کارت حرکت آخر به دلخواه یا شانس دارد.
            </span>
          </div>

          <div className="py-10 bg-slate-955 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-60 relative overflow-hidden shadow-inner">
            {!drawnCard ? (
              <button
                onClick={handleDrawLastMoveCard}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs py-3.5 px-8 rounded-full shadow-lg items-center gap-2 flex transition animate-pulse cursor-pointer"
              >
                کشیدن اتفاقی کارت آخرین روز
                <RefreshCw className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-4 animate-scale-up max-w-md px-6">
                <span className="text-[10px] text-amber-500 tracking-wider uppercase font-bold block">کارت شانس دریافت شده:</span>
                <span className="text-xl font-extrabold text-slate-100 block">{drawnCard.name}</span>
                <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
                  {drawnCard.description}
                </p>

                <div className="pt-3">
                  <button
                    onClick={handleConfirmExileWithCard}
                    className="bg-red-650 hover:bg-red-600 text-white font-bold text-xs py-2 px-6 rounded-full inline-flex items-center gap-1"
                  >
                    تایید تفهیم جریمه کارت و خروج شجاعانه
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs">
            <button
              onClick={() => {
                // If they want to skip pulling card, they can directly exclude
                onCommitDayExile(votedOutPlayerId, null);
                setIsLastMoveCardMode(false);
                setIsTrialMode(false);
              }}
              className="text-slate-500 hover:text-slate-350"
            >
              خارج کردن بازیکن بدون استفاده از کارت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
