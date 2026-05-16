import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LogOut, Volume2, VolumeX, Type, Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Icon3D } from "./Icon3D";

export const SettingsSheet = () => {
  const { profile, update } = useProfile();
  const nav = useNavigate();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Cài đặt" className="p-1.5">
          <Icon3D name="gear" size={28} alt="Cài đặt" />
        </Button>
      </SheetTrigger>
      <SheetContent className="rounded-l-3xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Cài đặt</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <Row icon={<Sparkles className="text-primary" />}
            title="Giảm chuyển động"
            desc="Màn hình bình tĩnh hơn, ít hiệu ứng hơn.">
            <Switch checked={!!profile?.reduced_motion}
              onCheckedChange={(v) => update({ reduced_motion: v })} />
          </Row>

          <Row icon={<Type className="text-primary" />}
            title="Chữ to hơn"
            desc="Dễ đọc hơn.">
            <Switch checked={!!profile?.large_text}
              onCheckedChange={(v) => update({ large_text: v })} />
          </Row>

          <Row icon={profile?.sound_on ? <Volume2 className="text-primary" /> : <VolumeX className="text-muted-foreground" />}
            title="Âm thanh"
            desc="Đọc thành tiếng và hiệu ứng nhẹ nhàng.">
            <Switch checked={!!profile?.sound_on}
              onCheckedChange={(v) => update({ sound_on: v })} />
          </Row>

          <div className="pt-4 border-t border-border">
            <Button variant="outline" className="w-full" onClick={async () => { await signOut(); nav("/"); }}>
              <LogOut /> Đăng xuất
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Row = ({ icon, title, desc, children }: any) => (
  <div className="card-soft p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">{icon}</div>
    <div className="flex-1">
      <p className="font-display font-bold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
    {children}
  </div>
);
