import { avatarById } from "@/lib/avatars";

export function Avatar({ avatar, name, size = 40 }: { avatar: string; name: string; size?: number }) {
  const a = avatarById(avatar);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl font-display font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${a.from}, ${a.to})`, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
