/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { GameState, Player, NightState, RoleFaction, GameEvent, KNOWN_ROLES } from "./types";
import SetupScreen from "./components/SetupScreen";
import NightPhase from "./components/NightPhase";
import DayPhase from "./components/DayPhase";
import GameReference from "./components/GameReference";
import EventTimeline from "./components/EventTimeline";
import { Sparkles, Trophy, HelpCircle, History, RefreshCw, Moon, Sunrise, ArrowLeftRight, Users, Award, ShieldAlert, Shield, Volume2, VolumeX } from "lucide-react";
import { playNightChime, playDaySunrise, playVictoryFanfare, playDeathSound, isAudioEnabled, setAudioEnabled } from "./utils/audio";

export default function App() {
  // Primary state engine
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    rolesConfig: {},
    currentPhase: "SETUP",
    cycleNumber: 1,
    events: [],
    nightActions: {
      mafiaTarget: null,
      doctorSave: null,
      detectiveInquiry: null,
      detectiveResult: null,
      lecterSave: null,
      sniperTarget: null,
      psychologistMute: null,
      diehardInquiry: false,
    },
    selectedMayorVeto: false,
    lastMutedPlayerId: null,
    daySpeechDuration: 35,
    winner: null,
  });

  // Casualty cache for morning briefs
  const [recentNightCasualties, setRecentNightCasualties] = useState<string[]>([]);
  // Floating support drawers in UI
  const [showReferenceDrawer, setShowReferenceDrawer] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  // Diehard report drawer
  const [showInquiryResults, setShowInquiryResults] = useState(false);
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Read sound toggle on mount
  useEffect(() => {
    setSoundEnabled(isAudioEnabled());
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    setAudioEnabled(nextVal);
  };

  // Restore game state from LocalStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("mafia_active_game_state");
    const savedCasualties = localStorage.getItem("mafia_active_recent_casualties");
    if (savedState) {
      try {
        setGameState(JSON.parse(savedState));
      } catch (e) {
        console.error("Error loading saved game state:", e);
      }
    }
    if (savedCasualties) {
      try {
        setRecentNightCasualties(JSON.parse(savedCasualties));
      } catch (e) {
        console.error("Error loading saved casualties:", e);
      }
    }
  }, []);

  // Save changes to localStorage
  const saveStateToStorage = (state: GameState, casualties: string[] = recentNightCasualties) => {
    setGameState(state);
    localStorage.setItem("mafia_active_game_state", JSON.stringify(state));
    localStorage.setItem("mafia_active_recent_casualties", JSON.stringify(casualties));
  };

  // 1. Setup triggers
  const handleStartGame = (allocatedPlayers: { id: string; name: string; roleId: string }[]) => {
    // Compile roles summary count
    const initialConfig: { [roleId: string]: number } = {};
    allocatedPlayers.forEach((p) => {
      initialConfig[p.roleId] = (initialConfig[p.roleId] || 0) + 1;
    });

    const playersState: Player[] = allocatedPlayers.map((ap) => ({
      id: ap.id,
      name: ap.name,
      roleId: ap.roleId,
      isAlive: true,
      warnings: 0,
      isMuted: false,
    }));

    const welcomeEvent: GameEvent = {
      id: `ev-welcome-${Date.now()}`,
      cycleNumber: 1,
      phase: "SETUP",
      timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      description: `بازی جدید مافیا با حضور ${allocatedPlayers.length} بازیکن متعهد و فاکتور تفکیک نقش‌ها آغاز گردید.`,
      type: "GENERAL",
    };

    const nextState: GameState = {
      ...gameState,
      players: playersState,
      rolesConfig: initialConfig,
      currentPhase: "NIGHT", // Begin with Night 1 (Introduction phase)
      cycleNumber: 1,
      events: [welcomeEvent],
      nightActions: {
        mafiaTarget: null,
        doctorSave: null,
        detectiveInquiry: null,
        detectiveResult: null,
        lecterSave: null,
        sniperTarget: null,
        psychologistMute: null,
        diehardInquiry: false,
      },
      winner: null,
    };

    setRecentNightCasualties([]);
    saveStateToStorage(nextState, []);
    playNightChime();
  };

  // 2. Commit Night decisions to produce morning briefing
  const handleCommitNight = (nightState: NightState) => {
    const nextPlayers = gameState.players.map((p) => ({ ...p, isMuted: false })); // Reset day-mute
    const casualties: string[] = [];
    const eventDetails: string[] = [];

    // Check if Intro night
    if (gameState.cycleNumber === 1) {
      // Night 1 is intro, no casualties
      const introEvent: GameEvent = {
        id: `ev-night1-${Date.now()}`,
        cycleNumber: 1,
        phase: "NIGHT",
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        description: "شب اول (شب معارفه) به اتمام رسید. معارفه سناریوی مافیا و گانه‌شناسی با موفقیت ثبت شد.",
        type: "GENERAL",
      };

      const nextState: GameState = {
        ...gameState,
        players: nextPlayers,
        currentPhase: "DAY",
        events: [...gameState.events, introEvent],
      };

      saveStateToStorage(nextState, []);
      playDaySunrise();
      return;
    }

    // NORMAL NIGHT CALCULATIONS (Night 2 onwards)
    // 1. Mafia Shoot vs Doctor Save
    let wasMafiaSaved = false;
    if (nightState.mafiaTarget) {
      if (nightState.mafiaTarget === nightState.doctorSave) {
        wasMafiaSaved = true;
        eventDetails.push(`حمله شلیک مافیا به بازیکن ${getPlayerName(nightState.mafiaTarget)} توسط دکتر خنثی شد.`);
      } else {
        // Did they have extra life (Diehard)?
        const targetPlayerIndex = nextPlayers.findIndex((p) => p.id === nightState.mafiaTarget);
        if (targetPlayerIndex !== -1) {
          const target = nextPlayers[targetPlayerIndex];
          if (target.roleId === "diehard" && !target.hasExtraLifeUsed) {
            // Survives first shoot!
            nextPlayers[targetPlayerIndex].hasExtraLifeUsed = true;
            wasMafiaSaved = true;
            eventDetails.push("جان‌سخت شهروندان هدف شلیک گلوله مافیا قرار گرفت اما با جان مکرر خود جان به در برد.");
          } else {
            nextPlayers[targetPlayerIndex].isAlive = false;
            casualties.push(target.name);
            eventDetails.push(`شلیک مافیا با موفقیت به هدف نشست؛ بازیکن ${target.name} از بازی خارج گردید.`);
          }
        }
      }
    }

    // 2. Sniper Action vs Doctor Lecter Save (or self kill if citizenship)
    if (nightState.sniperTarget && nightState.sniperTarget !== "SKIP") {
      const sniperRole = KNOWN_ROLES.find((r) => r.id === "sniper");
      const targetPlayer = nextPlayers.find((p) => p.id === nightState.sniperTarget);
      
      if (targetPlayer && targetPlayer.roleId) {
        const targetRole = KNOWN_ROLES.find((r) => r.id === targetPlayer.roleId);
        
        if (targetRole?.faction === RoleFaction.MAFIA) {
          // Sniper hit Mafia! Checked against Dr Lecter save
          if (nightState.sniperTarget === nightState.lecterSave) {
            eventDetails.push(`شلیک حرفه‌ای به بازیکن مافیا (${targetPlayer.name}) با جان کثیر جراحی دکتر لکتر ناکام ماند.`);
          } else {
            const targetIndex = nextPlayers.findIndex((p) => p.id === nightState.sniperTarget);
            if (targetIndex !== -1) {
              nextPlayers[targetIndex].isAlive = false;
              casualties.push(targetPlayer.name);
              eventDetails.push(`شلیک نقره‌ای حرفه‌ای در قلب مافیا؛ بازیکن ${targetPlayer.name} سرانجام کشته شد.`);
            }
          }
        } else if (targetRole?.faction === RoleFaction.CITIZEN) {
          // Sniper hit Citizen! Penalty is Sniper himself dies!
          const sniperIndex = nextPlayers.findIndex((p) => p.roleId === "sniper");
          if (sniperIndex !== -1 && nextPlayers[sniperIndex].isAlive) {
            nextPlayers[sniperIndex].isAlive = false;
            casualties.push(nextPlayers[sniperIndex].name);
            eventDetails.push(`جرم بزرگ! حرفه‌ای به شهروند خودی (${targetPlayer.name}) شلیک کرد و تاوانش خودکشی شبانه او گردید.`);
          }
        }
      }
    }

    // 3. Psychologist mute
    if (nightState.psychologistMute) {
      const muteIndex = nextPlayers.findIndex((p) => p.id === nightState.psychologistMute);
      if (muteIndex !== -1) {
        nextPlayers[muteIndex].isMuted = true;
        eventDetails.push(`بازیکن ${nextPlayers[muteIndex].name} توسط روان‌پزشک برای دور فردا ساکت شد.`);
      }
    }

    // Construct events log
    const nightSummaryLog: GameEvent = {
      id: `ev-nightCalculated-${Date.now()}`,
      cycleNumber: gameState.cycleNumber,
      phase: "NIGHT",
      timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      description: `شب ${gameState.cycleNumber} سپری شد. کشته‌های این شب: ${casualties.length === 0 ? "هیچکس" : casualties.join(" و ")}`,
      details: eventDetails.join(" \n"),
      type: casualties.length > 0 ? "DEATH" : "SAVE",
    };

    // Auto trigger Diehard status inquiry if checked
    if (nightState.diehardInquiry) {
      // Accumulate roles currently out
      const currentlyDeadRoles = gameState.players
        .filter((p) => !p.isAlive)
        .map((p) => p.roleId || "");
      // Add casualties of tonight
      casualties.forEach((name) => {
        const found = gameState.players.find((p) => p.name === name);
        if (found && found.roleId) currentlyDeadRoles.push(found.roleId);
      });
    }

    const nextState: GameState = {
      ...gameState,
      players: nextPlayers,
      currentPhase: "DAY",
      lastMutedPlayerId: nightState.psychologistMute,
      events: [...gameState.events, nightSummaryLog],
      nightActions: nightState,
    };

    setRecentNightCasualties(casualties);
    saveStateToStorage(nextState, casualties);
    playDaySunrise();
    if (casualties.length > 0) {
      setTimeout(() => {
        playDeathSound();
      }, 1500);
    }
    checkAndDeclareGameOver(nextPlayers, nextState.events);
  };

  // 3. Process Day voting exile & proceed to next night
  const handleCommitDayExile = (exiledPlayerId: string | null, cardId?: string | null) => {
    const nextPlayers = gameState.players.map((p) => ({ ...p, isMuted: false })); // Reset mute again
    const eventDetails: string[] = [];

    if (exiledPlayerId) {
      const targetIndex = nextPlayers.findIndex((p) => p.id === exiledPlayerId);
      if (targetIndex !== -1) {
        nextPlayers[targetIndex].isAlive = false;
        const targetName = nextPlayers[targetIndex].name;
        const targetRole = KNOWN_ROLES.find((r) => r.id === nextPlayers[targetIndex].roleId)?.name;

        let desc = `بازیکن ${targetName} با رای اکثریت ساکنین شهر محکوم و اخراج گردید.`;
        if (cardId) {
          const cardName = localStorage.getItem("mafia_last_drawn_card") || "کارت نامعلوم";
          desc += ` او به عنوان آخرین کلام، کارتِ "${cardName}" را به جریان انداخت.`;
        }

        const exileEvent: GameEvent = {
          id: `ev-dayExile-${Date.now()}`,
          cycleNumber: gameState.cycleNumber,
          phase: "DAY",
          timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          description: desc,
          details: `شخص اخراج شده: ${targetName} (نقشِ واقعی: ${targetRole})`,
          type: "DEATH",
        };

        const nextState: GameState = {
          ...gameState,
          players: nextPlayers,
          cycleNumber: gameState.cycleNumber + 1,
          currentPhase: "NIGHT",
          lastMutedPlayerId: null, // Reset mute
          events: [...gameState.events, exileEvent],
          // Reset night state for new cycle
          nightActions: {
            mafiaTarget: null,
            doctorSave: null,
            detectiveInquiry: null,
            detectiveResult: null,
            lecterSave: null,
            sniperTarget: null,
            psychologistMute: null,
            diehardInquiry: false,
          },
        };

        setRecentNightCasualties([]);
        saveStateToStorage(nextState, []);
        playDeathSound();
        setTimeout(() => {
          playNightChime();
        }, 1500);
        checkAndDeclareGameOver(nextPlayers, nextState.events);
      }
    } else {
      // Vetoed or skipped without exit
      const skipEvent: GameEvent = {
        id: `ev-daySkip-${Date.now()}`,
        cycleNumber: gameState.cycleNumber,
        phase: "DAY",
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        description: "مرحله محاکمه بدون خروجی خاتمه یافت و آرامش کاذب بر شهر حکمفرما ماند.",
        type: "GENERAL",
      };

      const nextState: GameState = {
        ...gameState,
        players: nextPlayers,
        cycleNumber: gameState.cycleNumber + 1,
        currentPhase: "NIGHT",
        lastMutedPlayerId: null,
        events: [...gameState.events, skipEvent],
        nightActions: {
          mafiaTarget: null,
          doctorSave: null,
          detectiveInquiry: null,
          detectiveResult: null,
          lecterSave: null,
          sniperTarget: null,
          psychologistMute: null,
          diehardInquiry: false,
        },
      };

      setRecentNightCasualties([]);
      saveStateToStorage(nextState, []);
      playNightChime();
    }
  };

  // 4. Update core players data triggers (Warnings, manual alive toggle, etc.)
  const handleUpdatePlayerStatus = (updatedPlayers: Player[]) => {
    const nextState = {
      ...gameState,
      players: updatedPlayers,
    };
    saveStateToStorage(nextState);
    checkAndDeclareGameOver(updatedPlayers, nextState.events);
  };

  // Trigger Diehard Inquiry accumulation
  const handleTriggerDiehardInquiryOutput = () => {
    // Collect all dead roles
    const deadRoles = gameState.players
      .filter((p) => !p.isAlive)
      .map((p) => p.roleId || "");

    if (deadRoles.length === 0) {
      alert("هنوز کشته یا اخراج شده‌ای وجود ندارد تا استخوان‌هایش شناسایی شود!");
      return;
    }

    setShowInquiryResults(true);
  };

  // 5. Check victory conditions directly
  const checkAndDeclareGameOver = (activeList: Player[], currentLogs: GameEvent[]) => {
    const aliveOnes = activeList.filter((p) => p.isAlive);
    const mafiaCount = aliveOnes.filter((p) => {
      const role = KNOWN_ROLES.find((r) => r.id === p.roleId);
      return role?.faction === RoleFaction.MAFIA;
    }).length;

    const citizenCount = aliveOnes.length - mafiaCount;

    if (mafiaCount === 0) {
      // Citizens win!
      const finalEvent: GameEvent = {
        id: `ev-victory-${Date.now()}`,
        cycleNumber: gameState.cycleNumber,
        phase: "SETUP",
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        description: "🏆 تبریک جاویدان! تمپرا و هوش همگانی بر توطئه غلبه کرد. تیم شهروندان پیروز مسابقه شد!",
        type: "GAME_OVER",
      };

      saveStateToStorage({
        ...gameState,
        players: activeList,
        currentPhase: "GAME_OVER",
        winner: RoleFaction.CITIZEN,
        events: [...currentLogs, finalEvent],
      });
      playVictoryFanfare();
    } else if (mafiaCount >= citizenCount) {
      // Mafia wins!
      const finalEvent: GameEvent = {
        id: `ev-victory-${Date.now()}`,
        cycleNumber: gameState.cycleNumber,
        phase: "SETUP",
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        description: "💀 شب دائم! هماهنگی و سیاست پنهانه بر شهر حاکم شد. تیم مافیا پیروز مسابقه شد!",
        type: "GAME_OVER",
      };

      saveStateToStorage({
        ...gameState,
        players: activeList,
        currentPhase: "GAME_OVER",
        winner: RoleFaction.MAFIA,
        events: [...currentLogs, finalEvent],
      });
      playVictoryFanfare();
    }
  };

  // Helper getters
  const getPlayerName = (id: string | null) => {
    if (!id) return "";
    return gameState.players.find((p) => p.id === id)?.name || "";
  };

  const handleResetFullGame = () => {
    const confirmReset = window.confirm("آیا مایلید این مسابقه را خاتمه دهید و به بخش تنظیمات بازگردید؟ تمامی روند جاری شما ریست خواهد شد.");
    if (confirmReset) {
      localStorage.removeItem("mafia_active_game_state");
      localStorage.removeItem("mafia_active_recent_casualties");
      setGameState({
        players: [],
        rolesConfig: {},
        currentPhase: "SETUP",
        cycleNumber: 1,
        events: [],
        nightActions: {
          mafiaTarget: null,
          doctorSave: null,
          detectiveInquiry: null,
          detectiveResult: null,
          lecterSave: null,
          sniperTarget: null,
          psychologistMute: null,
          diehardInquiry: false,
        },
        selectedMayorVeto: false,
        lastMutedPlayerId: null,
        daySpeechDuration: 35,
        winner: null,
      });
      setRecentNightCasualties([]);
      setShowInquiryResults(false);
    }
  };

  const getInquiryResultsList = () => {
    return gameState.players
      .filter((p) => !p.isAlive)
      .map((p) => p.roleId || "");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden antialiased select-none selection:bg-red-500/30">
      {/* 1. Header Navigation and Stats Top Rail */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-950/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-200">دستیار هوشمند گردانندگی مافیا</h1>
              <p className="text-[10px] text-slate-400">یکپارچه با قوانین و سناریوهای ویجیاتو</p>
            </div>
          </div>

          {/* Quick Realtime details for Narration Dashboard */}
          {gameState.currentPhase !== "SETUP" && (
            <div className="hidden sm:flex items-center gap-4 bg-slate-950/60 py-1.5 px-4 border border-slate-800 rounded-2xl text-xs">
              <div className="flex items-center gap-1 text-slate-300 font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>زنده: {gameState.players.filter((p) => p.isAlive).length} نفر</span>
              </div>
              <div className="flex items-center gap-1 text-red-400 font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>مافیا: {gameState.players.filter((p) => p.isAlive && KNOWN_ROLES.find(r => r.id === p.roleId)?.faction === RoleFaction.MAFIA).length}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400 font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>شهروند: {gameState.players.filter((p) => p.isAlive && KNOWN_ROLES.find(r => r.id === p.roleId)?.faction === RoleFaction.CITIZEN).length}</span>
              </div>
            </div>
          )}

          {/* Action buttons drawer toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowReferenceDrawer(true);
                setShowLogDrawer(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden md:inline">قوانین و نقش‌ها</span>
            </button>

            <button
              onClick={() => {
                setShowLogDrawer(true);
                setShowReferenceDrawer(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold relative"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">سند بازی</span>
              {gameState.events.length > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-600 text-[8px] font-bold text-white flex items-center justify-center">
                  {gameState.events.length}
                </span>
              )}
            </button>

            <button
              onClick={handleToggleSound}
              className={`p-2 border rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
                soundEnabled
                  ? "text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border-amber-900/30"
                  : "text-slate-500 bg-slate-900/40 hover:bg-slate-900 border-slate-800"
              }`}
              title={soundEnabled ? "غیرفعال‌سازی افکت‌های صوتی" : "فعال‌سازی افکت‌های صوتی"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500 animate-pulse" /> : <VolumeX className="w-4 h-4 text-slate-550" />}
              <span className="hidden md:inline">{soundEnabled ? "افکت صوتی: روشن" : "افکت صوتی: خاموش"}</span>
            </button>

            {gameState.currentPhase !== "SETUP" && (
              <button
                onClick={handleResetFullGame}
                className="p-2 text-red-400 hover:text-white hover:bg-red-950/20 border border-red-900/25 rounded-xl transition flex items-center gap-1 text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ریست بازی</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Primary Layout Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* SETUP SCREEN */}
        {gameState.currentPhase === "SETUP" && (
          <SetupScreen onStartGame={handleStartGame} />
        )}

        {/* NIGHT GUIDED PROCESS SCREEN */}
        {gameState.currentPhase === "NIGHT" && (
          <NightPhase
            players={gameState.players}
            rolesConfig={gameState.rolesConfig}
            cycleNumber={gameState.cycleNumber}
            onCommitNight={handleCommitNight}
          />
        )}

        {/* DAY DISCUSSION PANEL SCREEN */}
        {gameState.currentPhase === "DAY" && (
          <DayPhase
            players={gameState.players}
            cycleNumber={gameState.cycleNumber}
            warningsLimit={3}
            recentNightCasualties={recentNightCasualties}
            recentlyMutedPlayerId={gameState.lastMutedPlayerId}
            onCommitDayExile={handleCommitDayExile}
            onUpdatePlayerStatus={handleUpdatePlayerStatus}
            onTriggerDiehardInquiryOutput={handleTriggerDiehardInquiryOutput}
            showInquiryResults={showInquiryResults}
            inquiryResultsList={getInquiryResultsList()}
          />
        )}

        {/* GAME OVER VICTORY HUD SCREEN */}
        {gameState.currentPhase === "GAME_OVER" && (
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-scale-up">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto animate-bounce" />
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">پایان رویارویی شب و روز</h2>
              <p className="text-sm leading-relaxed text-slate-400">
                {gameState.winner === RoleFaction.CITIZEN
                  ? "شهروندان با اراده و همبستگی ملی توانستند بر نیروی تباهکاران پیروز شده و صلح را در رگ‌های شهر جاری کنند."
                  : "مافیا تحت لوای سکوت و تدبیر هدفمند توانست کلید حکومتی را ربوده و شهروند بازمانده را تار و مار کند."}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border text-sm font-extrabold flex justify-center gap-1 items-center ${
              gameState.winner === RoleFaction.CITIZEN
                ? "bg-blue-950/40 border-blue-900 text-blue-400"
                : "bg-red-950/40 border-red-900 text-red-400"
            }`}>
              {gameState.winner === RoleFaction.CITIZEN ? (
                <>
                  <Shield className="w-5 h-5" />
                  برنده: تیم شهروندان پیروز مسابقه شد
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5" />
                  برنده: تیم مافیا پیروز مسابقه شد
                </>
              )}
            </div>

            <button
              onClick={handleResetFullGame}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-800 py-3 px-8 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto w-full max-w-xs"
            >
              <RefreshCw className="w-4 h-4" />
              بازگشت به لابی تنظیمات مجدد
            </button>
          </div>
        )}
      </main>

      {/* Floating Rules Reference Side Drawer Overlay */}
      {showReferenceDrawer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl relative z-50">
            <GameReference onClose={() => setShowReferenceDrawer(false)} />
          </div>
        </div>
      )}

      {/* Floating Audit Logs History Side Drawer Overlay */}
      {showLogDrawer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl relative p-1 z-50">
            {/* Added container for layout details */}
            <div className="relative">
              <button
                onClick={() => setShowLogDrawer(false)}
                className="absolute left-4 top-4 text-xs font-bold bg-slate-950 border border-slate-800 hover:bg-slate-900 py-1.5 px-3 rounded-lg text-slate-300 z-10"
              >
                بستن تاریخچه
              </button>
              <EventTimeline
                events={gameState.events}
                onClearLogs={() => {
                  const confirmed = window.confirm("آیا حتماً می‌خواهید کل تاریخچه وقایع این بازی را پاک کنید؟");
                  if (confirmed) {
                    const clearedState = { ...gameState, events: [] };
                    saveStateToStorage(clearedState);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Humble Legal Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center text-[10px] text-slate-650 tracking-wide font-sans mt-8">
        Mafia Narrator Companion Tool • Designed for local game nights • All rights respect the host rules.
      </footer>
    </div>
  );
}
