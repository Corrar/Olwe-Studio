// Avatares dos perfis: degradê com um rostinho geométrico e um padrão de fundo, desenhados em SVG
// por <Avatar> (src/components/avatar.tsx). Os ids ficam salvos no banco: não renomeie nem remova.

export type AvatarFace = "smile" | "wink" | "joy" | "cool" | "bot" | "cat" | "love" | "wow" | "grin" | "sleepy";
export type AvatarPattern = "rings" | "dots" | "stripes" | "waves" | "grid" | "stars" | "none";

export interface AvatarDef {
  id: string;
  /** Nome lido pelo leitor de tela na escolha do avatar. */
  label: string;
  from: string;
  to: string;
  face: AvatarFace;
  pattern: AvatarPattern;
  /** Cor do rosto; escura por padrão, clara nos fundos escuros. */
  ink?: string;
}

export const AVATARS = [
  { id: "ember", label: "Brasa sorridente", from: "#FF6A3D", to: "#FFB547", face: "smile", pattern: "rings" },
  { id: "tide", label: "Maré piscando", from: "#2BC0B4", to: "#1D6FD8", face: "wink", pattern: "waves" },
  { id: "bloom", label: "Flor alegre", from: "#E8508C", to: "#8E4BE0", face: "joy", pattern: "dots" },
  { id: "moss", label: "Musgo de óculos escuros", from: "#7BC74D", to: "#1F8A5B", face: "cool", pattern: "stripes" },
  { id: "dusk", label: "Robô do crepúsculo", from: "#5B5FEF", to: "#B05BEF", face: "bot", pattern: "grid" },
  { id: "sand", label: "Gato da areia", from: "#E9C46A", to: "#C2703D", face: "cat", pattern: "none" },
  { id: "coral", label: "Coral apaixonado", from: "#FF8A65", to: "#E8508C", face: "love", pattern: "waves" },
  { id: "sky", label: "Céu surpreso", from: "#7AD3FF", to: "#3D6BE0", face: "wow", pattern: "dots" },
  { id: "lime", label: "Lima risonha", from: "#D9F26B", to: "#3DAE5A", face: "grin", pattern: "rings" },
  { id: "plum", label: "Ameixa piscando", from: "#D07BE0", to: "#5B2A86", face: "wink", pattern: "stripes" },
  { id: "ocean", label: "Gato do oceano", from: "#2EE6C9", to: "#0B5E7A", face: "cat", pattern: "dots" },
  { id: "night", label: "Noite sonolenta", from: "#3B4258", to: "#11131A", face: "sleepy", pattern: "stars", ink: "#FFB547" },
] as const satisfies readonly AvatarDef[];

export type AvatarId = (typeof AVATARS)[number]["id"];

export function avatarById(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
export const MAX_PROFILES = 5;
