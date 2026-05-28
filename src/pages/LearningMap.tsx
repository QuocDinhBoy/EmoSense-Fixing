import { Link } from "react-router-dom";
import { CheckCircle2, Lock, Play, BookOpen, Camera, Heart, Puzzle, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STAGES, ALL_LESSONS, lessonHref, type Lesson, type LessonActivity } from "@/data/lessons";
import { getLessonState, useLessonProgressTick } from "@/lib/lessonProgress";

const ActivityIcon: Record<LessonActivity, React.ComponentType<{ className?: string }>> = {
  flashcards: BookOpen,
  match: Puzzle,
  scenario: Sparkles,
  camera: Camera,
  journal: Heart,
};

const LearningMap = () => {
  const { user } = useAuth();
  const tick = useLessonProgressTick();
  const [serverCorrect, setServerCorrect] = useState<Record<string, number>>({});
  const [journalCount, setJournalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!user) {
      setLoaded(true);
      return;
    }
    const [progressRes, journalRes] = await Promise.all([
      supabase.from("progress").select("activity, correct").eq("user_id", user.id),
      supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const totals: Record<string, number> = {};
    (progressRes.data ?? []).forEach((r: any) => {
      totals[r.activity] = (totals[r.activity] ?? 0) + (r.correct ?? 0);
    });
    setServerCorrect(totals);
    setJournalCount(journalRes.count ?? 0);
    setLoaded(true);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`progress-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progress", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_entries", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Quy tắc trạng thái lesson:
   * - DONE  : localStorage `done=true` (đã đạt threshold ít nhất 1 lần)
   * - CURRENT: lesson chưa done đầu tiên trong toàn bộ lộ trình (mở khoá)
   * - LOCKED : các lesson sau current
   */
  // tick re-renders when localStorage changes
  void tick;
  const lessonStateFor = (l: Lesson) => {
    const ls = getLessonState(l.id);
    // Map fallback từ server (cho user cũ) — nếu server count ≥ threshold thì coi như done
    const serverActivityKey = l.activity === "scenario" ? "scenario" : l.activity;
    const serverHits = l.activity === "journal" ? journalCount : (serverCorrect[serverActivityKey] ?? 0);
    return {
      correct: Math.max(ls.correct, serverHits),
      done: ls.done || serverHits >= l.threshold,
    };
  };

  const computed = (() => {
    let firstUndoneFound = false;
    return ALL_LESSONS.map(l => {
      const s = lessonStateFor(l);
      let status: "done" | "current" | "locked" = "locked";
      if (s.done) status = "done";
      else if (!firstUndoneFound) {
        status = "current";
        firstUndoneFound = true;
      }
      return { lesson: l, ...s, status };
    });
  })();

  const map = new Map(computed.map(c => [c.lesson.id, c]));
  const totalDone = computed.filter(c => c.status === "done").length;
  const pct = Math.round((totalDone / ALL_LESSONS.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Lộ trình học của bạn</h1>
        <p className="text-muted-foreground text-lg">6 chặng – nhẹ nhàng, từng bước nhỏ.</p>
      </div>

      <div className="card-soft p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-bold text-sm">Tiến trình tổng</span>
          <span className="font-display text-sm text-muted-foreground">
            {totalDone}/{ALL_LESSONS.length} bài
          </span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-gradient-mint transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {!loaded ? (
        <div className="grid gap-5" aria-busy="true" aria-label="Đang tải tiến trình">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-soft p-6 animate-pulse">
              <div className="h-6 w-1/3 bg-muted rounded mb-3" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {STAGES.map((stage, sIdx) => {
            const stageLessons = stage.lessons.map(l => map.get(l.id)!).filter(Boolean);
            const doneInStage = stageLessons.filter(c => c.status === "done").length;
            const totalInStage = stage.lessons.length;
            const stageDone = doneInStage === totalInStage;
            const stageStarted = stageLessons.some(c => c.status === "done" || c.status === "current");
            const stagePct = Math.round((doneInStage / totalInStage) * 100);

            return (
              <motion.section
                key={stage.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.05 }}
                className="card-3d overflow-hidden"
              >
                {/* Stage header */}
                <header className={`p-5 md:p-6 ${stage.bg} flex items-center gap-4`}>
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-card shadow-soft flex items-center justify-center font-display text-2xl font-bold">
                    {stage.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-xl md:text-2xl font-bold">{stage.title}</h2>
                      {stageDone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-card/80 px-2 py-0.5 text-xs font-display">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emo-calm" /> Hoàn thành
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/80 text-sm md:text-base">{stage.childDesc}</p>
                    <div className="mt-2 h-2 rounded-full bg-card/60 overflow-hidden max-w-md">
                      <div
                        className="h-full bg-foreground/30 transition-all"
                        style={{ width: `${stagePct}%` }}
                      />
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-display shadow-soft shrink-0">
                    {doneInStage}/{totalInStage}
                  </span>
                </header>

                {/* Lessons in stage */}
                <ul className="divide-y divide-border">
                  {stage.lessons.map(lesson => {
                    const s = map.get(lesson.id)!;
                    const Icon = ActivityIcon[lesson.activity];
                    const Tag: any = s.status === "locked" ? "div" : Link;
                    return (
                      <li key={lesson.id}>
                        <Tag
                          to={s.status !== "locked" ? lessonHref(lesson) : undefined}
                          aria-label={`Bài ${lesson.n}: ${lesson.title}${
                            s.status === "done" ? " (đã hoàn thành)" : s.status === "locked" ? " (chưa mở)" : ""
                          }`}
                          className={`flex items-center gap-4 p-4 md:p-5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
                            s.status === "locked"
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-muted/40 active:bg-muted/60"
                          }`}
                        >
                          <div
                            className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                              s.status === "done"
                                ? "bg-gradient-mint"
                                : s.status === "current"
                                ? "bg-gradient-sky"
                                : "bg-muted"
                            }`}
                          >
                            <Icon className="w-5 h-5 text-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-display font-bold text-base md:text-lg truncate">
                                {lesson.n}. {lesson.title}
                              </h3>
                              <span
                                className={`text-[10px] font-display rounded-full px-2 py-0.5 ${
                                  lesson.imageMode === "real"
                                    ? "bg-secondary text-secondary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {lesson.imageMode === "real" ? "Ảnh thật" : "Hoạt hình"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{lesson.desc}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-display">
                              ⭐ +{lesson.reward} sao
                            </p>
                          </div>
                          {s.status === "done" && (
                            <CheckCircle2 className="w-6 h-6 text-emo-calm shrink-0" aria-hidden />
                          )}
                          {s.status === "locked" && (
                            <Lock className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                          )}
                          {s.status === "current" && (
                            <span className="inline-flex items-center gap-1 text-primary font-display text-sm shrink-0">
                              <Play className="w-5 h-5" /> Bắt đầu
                            </span>
                          )}
                        </Tag>
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearningMap;
