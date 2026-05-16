import happyImg from "@/assets/emotions/happy.png";
import sadImg from "@/assets/emotions/sad.png";
import angryImg from "@/assets/emotions/angry.png";
import scaredImg from "@/assets/emotions/scared.png";
import surprisedImg from "@/assets/emotions/surprised.png";
import calmImg from "@/assets/emotions/calm.png";
import loveImg from "@/assets/emotions/love.png";

export type EmotionKey =
  | "happy" | "sad" | "angry" | "scared" | "surprised" | "calm" | "love";

export interface Emotion {
  key: EmotionKey;
  label: string;
  emoji: string;
  image: string;
  color: string; // tailwind class
  description: string;
}

export const EMOTIONS: Emotion[] = [
  { key: "happy", label: "Vui", emoji: "😊", image: happyImg, color: "bg-emo-happy", description: "Khi có điều tốt đẹp xảy ra." },
  { key: "sad", label: "Buồn", emoji: "😢", image: sadImg, color: "bg-emo-sad", description: "Khi bạn nhớ ai đó hoặc cảm thấy chùng xuống." },
  { key: "angry", label: "Giận", emoji: "😠", image: angryImg, color: "bg-emo-angry", description: "Khi điều gì đó không công bằng." },
  { key: "scared", label: "Sợ", emoji: "😨", image: scaredImg, color: "bg-emo-scared", description: "Khi cảm thấy không an toàn." },
  { key: "surprised", label: "Ngạc nhiên", emoji: "😲", image: surprisedImg, color: "bg-emo-surprised", description: "Khi có điều bất ngờ xảy ra." },
  { key: "calm", label: "Bình yên", emoji: "😌", image: calmImg, color: "bg-emo-calm", description: "Khi bạn thấy thư giãn và an toàn." },
  { key: "love", label: "Yêu thương", emoji: "🥰", image: loveImg, color: "bg-emo-love", description: "Khi bạn cảm thấy được quan tâm." },
];

export const getEmotion = (k: EmotionKey) => EMOTIONS.find(e => e.key === k)!;
