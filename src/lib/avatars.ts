export const AVATARS = [
  { id: "ember", from: "#FF6A3D", to: "#FFB547" },
  { id: "tide", from: "#2BC0B4", to: "#1D6FD8" },
  { id: "bloom", from: "#E8508C", to: "#8E4BE0" },
  { id: "moss", from: "#7BC74D", to: "#1F8A5B" },
  { id: "dusk", from: "#5B5FEF", to: "#B05BEF" },
  { id: "sand", from: "#E9C46A", to: "#C2703D" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export function avatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
export const MAX_PROFILES = 5;
