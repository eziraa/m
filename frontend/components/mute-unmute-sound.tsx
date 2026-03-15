import React from "react";
import { Button } from "./ui/button";
import { AudioController } from "@/lib/audio-controller";
import { Volume2, VolumeX } from "lucide-react";

const MuteUnMuteSound = () => {
  const [soundMuted, setSoundMuted] = React.useState(false);

  // persist sound muted state in local storage
  React.useEffect(() => {
    const muted = AudioController.getInstance().isMuted();
    setSoundMuted(muted);
  }, []);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full bg-blue-600 h-9 w-9 border border-blue-600"
      onClick={() => {
        const nextMuted = AudioController.getInstance().toggleMuted();
        setSoundMuted(nextMuted);
      }}
    >
      {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </Button>
  );
};

export default MuteUnMuteSound;
