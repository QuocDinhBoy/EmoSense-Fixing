import { useEffect, useMemo, useState } from "react";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { EmotionBubble } from "@/components/EmotionBubble";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Volume2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { useSpeak, vibrate } from "@/lib/speech";
import { SCENES, scenesByLevel, sceneImage } from "@/data/scenarios";
import { getLessonById, lessonHref, ALL_LESSONS } from "@/data/lessons";
import { bumpLesson } from "@/lib/lessonProgress";
import { SmartImage } from "@/components/SmartImage";

const Scenarios = () => {
  const [params] = useSearchParams();
  const lessonId = params.get("lesson");
  const lesson = useMemo(() => (lessonId ? getLessonById(lessonId) : undefined), [lessonId]);

  const scenes = useMemo(() => {
    if (lesson?.scenarioLevel) return scenesByLevel(lesson.scenarioLevel);
    return SCENES.filter(s => s.level <= 2); // mặc định: ngắn + vài câu
  }, [lesson]);

  const [i, setI] = useState(0);
  const [pick, setPick] = useState<EmotionKey | null>(null);
  const [hasFailedThisScene, setHasFailedThisScene] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const scene = scenes[i % Math.max(scenes.length, 1)];
  // Đáp án chấp nhận: chính + alt (cho cấp 3)
  const isCorrect = (k: EmotionKey | null) =>
    !!k && (k === scene.answer || k === scene.alt);
  const correctEmotion = scene ? getEmotion(scene.answer) : EMOTIONS[0];
  const altEmotion = scene?.alt ? getEmotion(scene.alt) : null;
  const correct = isCorrect(pick);

  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak, stop } = useSpeak();

  // Reset khi đổi lesson
  useEffect(() => {
    setI(0);
    setPick(null);
    setHasFailedThisScene(false);
    setDoneCount(0);
  }, [lessonId]);

  useEffect(() => {
    stop();
    if (interacted && scene) speak(scene.text);
    return () => stop();
  }, [i, scene?.text, speak, stop, interacted]);

  const choose = async (k: EmotionKey) => {
    if (pick) return;
    setInteracted(true);
    setPick(k);
    const ok = isCorrect(k);
    if (user) {
      await logProgress({ userId: user.id, activity: "scenario", emotion: scene.answer, correct: ok });
    }
    if (ok) {
      vibrate(15);
      if (!hasFailedThisScene) {
        await addStars(2);
        setDoneCount(c => c + 1);
        if (lesson) bumpLesson(lesson.id, lesson.threshold, true);
      }
    } else {
      setHasFailedThisScene(true);
    }
    setTimeout(() => speak(`${ok ? "Đúng rồi. " : "Suy nghĩ tốt lắm. "}${scene.why}`), 200);
  };

  const next = () => {
    setPick(null);
    setHasFailedThisScene(false);
    setI((i + 1) % scenes.length);
  };
  const retry = () => setPick(null);

  const nextLessonHref = (() => {
    if (!lesson) return "/app/learn";
    const idx = ALL_LESSONS.findIndex(l => l.id === lesson.id);
    const next = ALL_LESSONS[idx + 1];
    return next ? lessonHref(next) : "/app/learn";
  })();

  if (!scene) {
    return (
      <div className="max-w-3xl mx-auto card-soft p-8 text-center">
        <p className="font-display">Chưa có tình huống cho cấp này.</p>
      </div>
    );
  }

  const useImage = lesson?.imageMode === "real";
  const sceneImg = useImage ? sceneImage(scene) : undefined;
  const lessonComplete = lesson ? doneCount >= lesson.threshold : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {lesson ? lesson.title : "Bạn ấy sẽ cảm thấy thế nào?"}
          </h1>
          <p className="text-muted-foreground">
            {lesson?.scenarioLevel === 3
              ? "Có thể có 2 cảm xúc cùng lúc – chọn cảm xúc rõ nhất."
              : "Đọc câu chuyện nhỏ rồi chọn một cảm xúc."}
          </p>
        </div>
        {lesson && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft">
            ⭐ {doneCount}/{lesson.threshold}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="card-3d overflow-hidden bg-gradient-bubble"
        >
          {useImage && sceneImg && (
            <div className="aspect-[16/9] bg-muted">
              <SmartImage
                sources={[sceneImg]}
                fallback={correctEmotion.image}
                alt="Minh hoạ tình huống"
                className=""
              />
            </div>
          )}
          <div className="p-6 md:p-8 relative">
            <p className="font-display text-2xl md:text-3xl leading-relaxed pr-14">
              {scene.text}
            </p>
            <button
              type="button"
              onClick={() => {
                setInteracted(true);
                speak(scene.text);
              }}
              aria-label="Nghe đọc câu chuyện"
              className="absolute top-4 right-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-soft border border-border hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            >
              <Volume2 className="w-5 h-5 text-primary" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {EMOTIONS.map(e => (
          <EmotionBubble
            key={e.key}
            emotion={e}
            size="sm"
            selected={pick === e.key}
            onClick={() => choose(e.key)}
            speakOnClick={false}
          />
        ))}
      </div>

      {pick && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card-soft p-6 ${correct ? "bg-gradient-mint" : "bg-gradient-sunshine"}`}
        >
          <p className="font-display text-xl font-bold mb-1">
            {correct ? "Đúng rồi! 🌟" : "Suy nghĩ tốt lắm 💛"}
          </p>
          {!correct && (
            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
              <span className="font-display text-sm">Đáp án:</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 border border-border">
                <img
                  src={correctEmotion.image}
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain"
                />
                <strong className="font-display text-sm">{correctEmotion.label}</strong>
              </span>
              {altEmotion && (
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 border border-border">
                  <img
                    src={altEmotion.image}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                  <span className="font-display text-sm">
                    hoặc <strong>{altEmotion.label}</strong>
                  </span>
                </span>
              )}
            </div>
          )}
          <p className="text-foreground/80">{scene.why}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {!correct && (
              <Button variant="outline" size="lg" onClick={retry}>
                Thử lại
              </Button>
            )}
            {lessonComplete ? (
              <Button asChild variant="hero" size="lg">
                <Link to={nextLessonHref}>Bài tiếp theo <ChevronRight /></Link>
              </Button>
            ) : (
              <Button variant="hero" size="lg" onClick={next}>
                Câu chuyện tiếp <ChevronRight />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {lessonComplete && !pick && (
        <div className="card-3d p-6 bg-gradient-mint text-center">
          <h2 className="font-display text-2xl font-bold mb-1">Hoàn thành bài học! 🎉</h2>
          <p className="text-foreground/80 mb-3">Bạn đã trả lời đúng đủ số câu cần.</p>
          <Button asChild variant="hero" size="lg">
            <Link to={nextLessonHref}>Bài tiếp theo</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Scenarios;
