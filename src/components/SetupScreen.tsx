/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { KNOWN_ROLES, GAME_PRESETS, Role, RoleFaction } from "../types";
import { Users, UserPlus, Trash2, Check, Sparkles, Sliders, Play, Tv, ArrowRight, Eye, EyeOff, Save, FolderOpen } from "lucide-react";

interface SetupScreenProps {
  onStartGame: (players: { id: string; name: string; roleId: string }[]) => void;
}

export default function SetupScreen({ onStartGame }: SetupScreenProps) {
  // Master player names list
  const [playerInput, setPlayerInput] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [savedGroups, setSavedGroups] = useState<{ [groupName: string]: string[] }>({});
  const [saveGroupNameInput, setSaveGroupNameInput] = useState("");
  const [showSaveGroupModal, setShowSaveGroupModal] = useState(false);

  // Active preset or custom configuration
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(1); // Default to "Nights of Mafia (10 players)"
  const [rolesConfig, setRolesConfig] = useState<{ [roleId: string]: number }>({});
  const [assignmentMethod, setAssignmentMethod] = useState<"random" | "manual">("random");

  // Reveal cards sub-state
  const [showRevealWizard, setShowRevealWizard] = useState(false);
  const [revealIndex, setRevealIndex] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [assignedPlayers, setAssignedPlayers] = useState<{ id: string; name: string; roleId: string }[]>([]);

  // Manual role allocation dropdown selections
  const [manualSelection, setManualSelection] = useState<{ [playerName: string]: string }>({});

  // On mount, load players/groups from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mafia_saved_players");
    if (saved) {
      try {
        setPlayers(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    const groups = localStorage.getItem("mafia_saved_groups");
    if (groups) {
      try {
        setSavedGroups(JSON.parse(groups));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Initialize roles from preset
  useEffect(() => {
    if (GAME_PRESETS[selectedPresetIndex]) {
      setRolesConfig(GAME_PRESETS[selectedPresetIndex].roles);
      // Auto adjusts mock players for the active preset if user list is empty
      if (players.length === 0) {
        const dummyPlayers = Array.from({ length: GAME_PRESETS[selectedPresetIndex].totalPlayers }, (_, i) => `بازیکن ${i + 1}`);
        setPlayers(dummyPlayers);
      }
    }
  }, [selectedPresetIndex]);

  // Save general list to localStorage
  const savePlayersList = (list: string[]) => {
    setPlayers(list);
    localStorage.setItem("mafia_saved_players", JSON.stringify(list));
  };

  // Add a player
  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = playerInput.trim();
    if (!name) return;
    if (players.includes(name)) {
      alert("این نام تکراری است!");
      return;
    }
    const newList = [...players, name];
    savePlayersList(newList);
    setPlayerInput("");
  };

  // Remove a player
  const handleRemovePlayer = (index: number) => {
    const newList = players.filter((_, i) => i !== index);
    savePlayersList(newList);
  };

  // Save current player group to localStorage
  const handleSaveGroup = () => {
    const groupName = saveGroupNameInput.trim();
    if (!groupName) return;
    const newGroups = { ...savedGroups, [groupName]: players };
    setSavedGroups(newGroups);
    localStorage.setItem("mafia_saved_groups", JSON.stringify(newGroups));
    setSaveGroupNameInput("");
    setShowSaveGroupModal(false);
    alert(`گروه "${groupName}" با موفقیت ذخیره شد.`);
  };

  // Load a player group
  const handleLoadGroup = (groupName: string) => {
    if (savedGroups[groupName]) {
      savePlayersList(savedGroups[groupName]);
    }
  };

  // Delete a saved group
  const handleDeleteGroup = (groupName: string) => {
    const newGroups = { ...savedGroups };
    delete newGroups[groupName];
    setSavedGroups(newGroups);
    localStorage.setItem("mafia_saved_groups", JSON.stringify(newGroups));
  };

  // Adjust count for a specific role
  const handleAdjustRole = (roleId: string, delta: number) => {
    const current = rolesConfig[roleId] || 0;
    const nextValue = Math.max(0, current + delta);
    setRolesConfig({
      ...rolesConfig,
      [roleId]: nextValue,
    });
    // Set customized preset status
    setSelectedPresetIndex(-1);
  };

  // Calculations for setup
  const totalRolesCount = (Object.values(rolesConfig) as number[]).reduce((sum, count) => sum + count, 0);
  const mafiaRolesCount = KNOWN_ROLES.filter((r) => r.faction === RoleFaction.MAFIA)
    .reduce((sum, r) => sum + (rolesConfig[r.id] || 0), 0);
  const citizenRolesCount = KNOWN_ROLES.filter((r) => r.faction === RoleFaction.CITIZEN)
    .reduce((sum, r) => sum + (rolesConfig[r.id] || 0), 0);

  // Run validation and prepare allocations
  const handleValidateAndAssign = () => {
    if (players.length !== totalRolesCount) {
      alert(`تعداد بازیکنان (${players.length} نفر) باید دقیقاً با مجموع نقش‌های تعریف شده (${totalRolesCount} نقش) همخوانی داشته باشد!`);
      return;
    }

    if (assignmentMethod === "random") {
      // Create a pool of roles
      const rolePool: string[] = [];
      (Object.entries(rolesConfig) as [string, number][]).forEach(([roleId, count]) => {
        for (let i = 0; i < count; i++) {
          rolePool.push(roleId);
        }
      });

      // Shuffle role pool
      const shuffledRoles = [...rolePool].sort(() => Math.random() - 0.5);

      // Pair each player with a role
      const matched = players.map((name, index) => ({
        id: `p-${index}-${Date.now()}`,
        name,
        roleId: shuffledRoles[index],
      }));

      setAssignedPlayers(matched);
      // Open card reveal wizard
      setShowRevealWizard(true);
      setRevealIndex(0);
      setCardRevealed(false);
    } else {
      // Manual mode preparation
      // Initialize manual selections based on previous selections or empty
      const initialManual: { [playerName: string]: string } = {};
      players.forEach((p) => {
        initialManual[p] = manualSelection[p] || "";
      });
      setManualSelection(initialManual);
    }
  };

  // Handle direct launch for manual mode
  const handleLaunchManualGame = () => {
    // Validate if all player roles are assigned
    const unassigned = players.filter((p) => !manualSelection[p]);
    if (unassigned.length > 0) {
      alert(`لطفاً نقشِ بازیکنان زیر را به صورت دستی پر کنید:\n${unassigned.join(", ")}`);
      return;
    }

    // Validate that the assigned counts match rolesConfig exactly
    const actualCounts: { [roleId: string]: number } = {};
    (Object.values(manualSelection) as string[]).forEach((roleId) => {
      actualCounts[roleId] = (actualCounts[roleId] || 0) + 1;
    });

    let mismatch = false;
    (Object.entries(rolesConfig) as [string, number][]).forEach(([roleId, targetCount]) => {
      const actualCount = actualCounts[roleId] || 0;
      if (actualCount !== targetCount) {
        mismatch = true;
      }
    });

    if (mismatch) {
      alert("نقش‌های دستی داده شده به بازیکنان با تعداد نقش‌های تنظیم شده هماهنگی ندارد! لطفاً کنترل کنید.");
      return;
    }

    const matched = players.map((name, index) => ({
      id: `p-${index}-${Date.now()}`,
      name,
      roleId: manualSelection[name],
    }));

    onStartGame(matched);
  };

  const handleRevealNext = () => {
    if (revealIndex + 1 < assignedPlayers.length) {
      setRevealIndex(revealIndex + 1);
      setCardRevealed(false);
    } else {
      // Completed reveal cascade, start the game!
      setShowRevealWizard(false);
      onStartGame(assignedPlayers);
    }
  };

  // Render role setup list
  const getRoleDetails = (roleId: string) => KNOWN_ROLES.find((r) => r.id === roleId);

  return (
    <div className="space-y-8 text-right dir-rtl" style={{ direction: "rtl" }}>
      {/* Setup Home Screen */}
      {!showRevealWizard ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Players Roster - Left */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold text-slate-100">فهرست بازیکنان ({players.length} نفر)</h2>
              </div>
              <button
                onClick={() => setShowSaveGroupModal(true)}
                className="text-xs flex items-center gap-1.5 text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition"
              >
                <Save className="w-3.5 h-3.5" />
                ذخیره اکیپ
              </button>
            </div>

            {/* Save Group Modal */}
            {showSaveGroupModal && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
                  <h3 className="font-bold text-slate-100 text-sm">ذخیره اکیپ جدید</h3>
                  <p className="text-xs text-slate-400">نام این اکیپ (مثلا اکیپ دانشگاه، همکاران) را بنویسید:</p>
                  <input
                    type="text"
                    value={saveGroupNameInput}
                    onChange={(e) => setSaveGroupNameInput(e.target.value)}
                    placeholder="نام اکیپ..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setShowSaveGroupModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveGroup}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-lg text-white font-bold"
                    >
                      ذخیره
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Load Groups */}
            {Object.keys(savedGroups).length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-semibold flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  اکیپ‌های ذخیره شده:
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(savedGroups).map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 py-1 pl-2 pr-1 rounded-full text-xs"
                    >
                      <button
                        onClick={() => handleLoadGroup(name)}
                        className="text-slate-300 hover:text-white transition px-1"
                      >
                        {name} ({savedGroups[name].length} نفر)
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(name)}
                        className="text-slate-500 hover:text-red-400 p-0.5 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Player Input */}
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <input
                type="text"
                placeholder="نام بازیکن جدید..."
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-red-500 transition"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500/90 text-white p-2 px-3.5 rounded-xl transition flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                افزودن
              </button>
            </form>

            {/* Player Names List Scrollable */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {players.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  هیچ بازیکنی اضافه نشده است. بازیکنان را اضافه کنید یا از الگوهای آماده استفاده کنید.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {players.map((name, index) => (
                    <div
                      key={index}
                      className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 flex justify-between items-center hover:bg-slate-950/80 transition"
                    >
                      <span className="text-sm font-medium text-slate-300">
                        {index + 1}. {name}
                      </span>
                      <button
                        onClick={() => handleRemovePlayer(index)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-900 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Roles Config - Right */}
          <div className="lg:col-span-12 xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex border-b border-slate-800 pb-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-100">پیکربندی نقش‌های بازی</h2>
              </div>
            </div>

            {/* Presets Grid Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">انتخاب الگوی سناریوی آماده:</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {GAME_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPresetIndex(idx)}
                    className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between h-24 ${
                      selectedPresetIndex === idx
                        ? "bg-slate-800/80 border-amber-500 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                        : "bg-slate-950/50 border-slate-800 hover:bg-slate-800/30"
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-bold block ${selectedPresetIndex === idx ? "text-amber-400" : "text-slate-300"}`}>
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 block leading-relaxed line-clamp-2">
                        {preset.description}
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono block w-fit self-end mt-2">
                      {preset.totalPlayers} بازیکن
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Assignment Counter / Tuning Room */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-1.5 text-red-500 font-bold">
                  <span>مافیا: {mafiaRolesCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-500 font-bold">
                  <span>شهروندان: {citizenRolesCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>کل کاراکترها: {totalRolesCount}</span>
                </div>
              </div>

              {/* Warnings / Stats Check */}
              {players.length !== totalRolesCount && (
                <div className="bg-red-950/40 border border-red-900/40 text-red-300 p-3 rounded-xl text-xs space-y-1 leading-relaxed">
                  ⚠️ تعداد کل بازیکنان ({players.length} نفر) با تعداد کاراکترهای انتخابی شما ({totalRolesCount} نقش) یکسان نیست! لطفاً با اضافه/کم کردن بازیکن یا تنظیم مجدد نقش‌ها، آن‌ها را به یک میزان برسانید.
                </div>
              )}

              {/* Role selection tuning list */}
              <div className="space-y-4">
                {/* Team Mafia Tuning */}
                <div>
                  <h4 className="text-xs font-bold text-red-400 mb-2 border-r-2 border-red-500 pr-2">نقش‌های مافیا</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {KNOWN_ROLES.filter((r) => r.faction === RoleFaction.MAFIA).map((role) => {
                      const count = rolesConfig[role.id] || 0;
                      return (
                        <div key={role.id} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold block text-slate-200">{role.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[180px] mt-0.5">{role.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAdjustRole(role.id, -1)}
                              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center font-bold font-mono transition text-sm"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-mono font-bold text-sm text-red-500">{count}</span>
                            <button
                              onClick={() => handleAdjustRole(role.id, 1)}
                              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center font-bold font-mono transition text-sm"
                              disabled={count >= role.maxCount}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team Citizen Tuning */}
                <div>
                  <h4 className="text-xs font-bold text-blue-400 mb-2 border-r-2 border-blue-500 pr-2">نقش‌های شهروندان</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {KNOWN_ROLES.filter((r) => r.faction === RoleFaction.CITIZEN).map((role) => {
                      const count = rolesConfig[role.id] || 0;
                      return (
                        <div key={role.id} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold block text-slate-200">{role.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[180px] mt-0.5">{role.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAdjustRole(role.id, -1)}
                              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center font-bold font-mono transition text-sm"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-mono font-bold text-sm text-blue-400">{count}</span>
                            <button
                              onClick={() => handleAdjustRole(role.id, 1)}
                              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center font-bold font-mono transition text-sm"
                              disabled={count >= role.maxCount}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Deployment Panel / Assignment Mode Toggle */}
            <div className="border-t border-slate-800 pt-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold block">مکانیسم تقسیم کارت ملزومات:</label>
                  <div className="inline-flex gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setAssignmentMethod("random")}
                      className={`px-4 py-1.5 rounded-lg transition ${
                        assignmentMethod === "random"
                          ? "bg-red-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      قرعه‌کشی و معارفه توسط اپ (سیستم قرعه فرضی)
                    </button>
                    <button
                      onClick={() => setAssignmentMethod("manual")}
                      className={`px-4 py-1.5 rounded-lg transition ${
                        assignmentMethod === "manual"
                          ? "bg-red-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      انتساب دستی (برای برگه/کارت فیزیکی)
                    </button>
                  </div>
                </div>

                {players.length === totalRolesCount && assignmentMethod === "random" && (
                  <button
                    onClick={handleValidateAndAssign}
                    className="w-full md:w-auto bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm py-3 px-8 rounded-xl items-center gap-2 flex justify-center shadow-lg hover:shadow-red-900/20 active:scale-95 transition"
                  >
                    قرعه‌کشی و شروع کارت‌خوان
                    <Play className="w-4 h-4" />
                  </button>
                )}

                {players.length === totalRolesCount && assignmentMethod === "manual" && (
                  <button
                    onClick={handleValidateAndAssign}
                    className="w-full md:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm py-3 px-8 rounded-xl items-center gap-2 flex justify-center shadow-lg hover:shadow-amber-900/20 active:scale-95 transition"
                  >
                    تایید و ایجاد فرم انتساب دستی
                    <Sliders className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Manual Selection Grid Block */}
              {assignmentMethod === "manual" && Object.keys(manualSelection).length > 0 && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                    اختصاص دادن نقش به تک‌تک بازیکنان:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {players.map((playerName) => (
                      <div key={playerName} className="flex items-center justify-between border-b border-slate-900 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="text-xs text-slate-300 font-bold">{playerName}</span>
                        <select
                          value={manualSelection[playerName] || ""}
                          onChange={(e) => setManualSelection({ ...manualSelection, [playerName]: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-1.5 text-slate-200 w-44"
                        >
                          <option value="">-- انتخاب نقش --</option>
                          {(Object.entries(rolesConfig) as [string, number][])
                            .filter(([_, count]) => count > 0)
                            .map(([roleId]) => {
                              const details = getRoleDetails(roleId);
                              return (
                                <option key={roleId} value={roleId}>
                                  {details?.name}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleLaunchManualGame}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    تایید انتصابات و شروع بازی مافیا
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Reveal Wizard Mode (If assignment is Random and ready) */
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-8 shadow-2xl">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-slate-200">فرآیند تقسیم مخفیانه کارت‌ها</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              گوشی موبایل یا تبلت را به بازیکن ذکر شده بدهید تا کارت خود را مخفیانه بخواند.
            </p>
          </div>

          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>کارت {revealIndex + 1} از {assignedPlayers.length}</span>
            <span>کیفیت بازی متعادل</span>
          </div>

          <div className="py-12 px-6 bg-slate-950 border border-slate-800/80 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-64 shadow-inner">
            <span className="text-sm text-slate-400 block mb-2">نوبت بازیکن:</span>
            <span className="text-2xl font-bold block text-amber-500 mb-6">{assignedPlayers[revealIndex].name}</span>

            {!cardRevealed ? (
              <button
                onClick={() => setCardRevealed(true)}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm py-3 px-8 rounded-full flex items-center gap-2 shadow-lg cursor-pointer transition"
              >
                نمایش مخفیانه نقش
                <Eye className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-4 animate-fade-in animate-duration-300">
                <span className="text-xs text-slate-500 tracking-wider font-mono">نقش اختصاص یافته:</span>
                <span className={`text-xl font-extrabold block uppercase tracking-wide ${
                  getRoleDetails(assignedPlayers[revealIndex].roleId)?.faction === RoleFaction.MAFIA
                    ? "text-red-500"
                    : "text-blue-500"
                }`}>
                  {getRoleDetails(assignedPlayers[revealIndex].roleId)?.name}
                </span>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-w-sm text-right mx-auto">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">توضیح نقش کلامی:</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {getRoleDetails(assignedPlayers[revealIndex].roleId)?.description}
                  </p>
                </div>

                <button
                  onClick={handleRevealNext}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs py-2 px-6 rounded-full inline-flex items-center gap-1.5 transition"
                >
                  نقش را دیدم (بستن و نفر بعدی)
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs">
            <button
              onClick={() => setShowRevealWizard(false)}
              className="text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              انصراف و اصلاح لیست
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
