/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { KNOWN_ROLES, LAST_MOVE_CARDS, RoleFaction } from "../types";
import { BookOpen, Shield, ShieldAlert, Award, ArrowLeftRight, HelpCircle } from "lucide-react";

interface GameReferenceProps {
  onClose?: () => void;
}

export default function GameReference({ onClose }: GameReferenceProps) {
  const [activeTab, setActiveTab] = useState<"roles" | "rules" | "cards">("roles");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 dir-rtl" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold font-sans">راهنما و قوانین کامل بازی مافیا</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition"
          >
            بستن راهنما
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 font-medium text-sm transition-all border-b-2 rounded-t-lg ${
            activeTab === "roles"
              ? "border-red-500 text-red-500 bg-slate-800/50"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          معرفی نقش‌ها
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 font-medium text-sm transition-all border-b-2 rounded-t-lg ${
            activeTab === "rules"
              ? "border-red-500 text-red-500 bg-slate-800/50"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          قوانین طلایی (ویجیاتو)
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`px-4 py-2 font-medium text-sm transition-all border-b-2 rounded-t-lg ${
            activeTab === "cards"
              ? "border-red-500 text-red-500 bg-slate-800/50"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          کارت‌های حرکت آخر
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === "roles" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              شناخت دقیق نقش‌ها کلید اداره بی‌نقص بازی مافیا است. در زیر لیست نقش‌های استاندارد سناریو به همراه توضیحات کلیدی آورده شده است:
            </p>

            <div className="space-y-6">
              {/* Mafia Faction Headers */}
              <div>
                <h3 className="text-sm font-semibold text-red-400 bg-red-950/40 p-2 rounded-lg mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  نقش‌های تیم مافیا (اقلیت آگاه)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {KNOWN_ROLES.filter((r) => r.faction === RoleFaction.MAFIA).map((role) => (
                    <div key={role.id} className="bg-slate-950/60 p-4 rounded-xl border border-red-950/30 hover:border-red-900/40 transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-200">{role.name}</span>
                        <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full uppercase">
                          {role.englishName}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">{role.description}</p>
                      {role.hasNightAction && (
                        <div className="mt-2 text-[10px] text-red-400/80 bg-red-950/20 px-2 py-0.5 rounded inline-block">
                          بیداری در شب دارد
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Citizen Faction Headers */}
              <div>
                <h3 className="text-sm font-semibold text-blue-400 bg-blue-950/40 p-2 rounded-lg mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  نقش‌های تیم شهروندان (اکثریت ناآگاه)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {KNOWN_ROLES.filter((r) => r.faction === RoleFaction.CITIZEN).map((role) => (
                    <div key={role.id} className="bg-slate-950/60 p-4 rounded-xl border border-blue-950/30 hover:border-blue-900/40 transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-200">{role.name}</span>
                        <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full uppercase">
                          {role.englishName}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">{role.description}</p>
                      {role.hasNightAction && (
                        <div className="mt-2 text-[10px] text-blue-400/80 bg-blue-950/20 px-2 py-0.5 rounded inline-block">
                          بیداری در شب دارد
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gold-400 flex items-center gap-2 mb-2 text-amber-400">
              <Award className="w-5 h-5 text-amber-400" />
              قوانین زنجیره‌ای و ساختار بازی طبق راهنمای ویجیاتو
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 text-sm block mb-1">۱. تعادل سهمیه‌ها در چیدمان بازی</span>
                برای چیدمان عادلانه، معمولا ۱/۳ تعداد کل بازیکنان به عنوان تیم مافیا تخصیص می‌یابد. به عنوان مثال در بازی ۱۰ نفره، ۳ مافیا در برابر ۷ شهروند صف‌آرایی می‌کنند.
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 text-sm block mb-1">۲. فاز شب معارفه (شب صفر)</span>
                در شب اول هیچ شلیکی انجام نمی‌شود. نقش‌ها فقط بیدار می‌شوند تا گرداننده را بشناسند و بازیکنان مافیا نیز همنوعان خود را شناسایی کنند.
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 text-sm block mb-1">۳. قانون شلیک تک تیرانداز (حرفه‌ای)</span>
                یکی از مهم‌ترین قوانین مهیج بازی: اگر حرفه‌ای به مافیا شلیک کند، آن مافیا در صورت نجات نیافتن توسط پزشک مافیا می‌میرد. اما اگر حرفه‌ای به اشتباه به شهروند شلیک کند، جریمه او مرگ خود حرفه‌ای در همان شب است.
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 text-sm block mb-1">۴. شادابی و جریمه‌ها (اخطار کلامی)</span>
                بر اساس مرسوم، هر بازیکن مجاز است حداکثر ۲ اخطار انضباطی دریافت کند. با دریافت اخطار سوم، بازیکن از صحبت در نوبت بعد محروم شده و اخطار چهارم منجر به اخراج مستقیم انضباطی بازیکن می‌شود.
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 text-sm block mb-1">۵. مرحله رای‌گیری و وتوی شهردار</span>
                هنگامی که بازیکنان کاندید دریافت اکثریت مطلق آرا می‌شوند، به دادگاه می‌روند. در این مرحله شهردار زنده می‌تواند بازی را متوقف کند (رای‌گیری کلاً باطل شود) یا حکم مستقیم اخراج صادر کند.
              </div>
            </div>
          </div>
        )}

        {activeTab === "cards" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2 mb-2">
              <ArrowLeftRight className="w-5 h-5" />
              کارت‌های حرکت آخر (ویژه خروج بازیکنان)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              در بازی‌های پیشرفته و مدرن ایرانی، بازیکنی که با رای روز از بازی اخراج می‌شود دست خالی نمی‌رود؛ او شانس انتخاب یکی از کارت‌های حرکت آخر را برای تاثیر گذاری نهایی بر روند بازی دارد:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LAST_MOVE_CARDS.map((card) => (
                <div key={card.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 transition">
                  <span className="font-bold text-slate-200 text-xs block mb-1 text-amber-500">{card.name}</span>
                  <p className="text-xs leading-relaxed text-slate-400">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
