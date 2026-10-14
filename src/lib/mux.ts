import "server-only";
import { createPrivateKey, type KeyObject } from "node:crypto";
import { SignJWT } from "jose";

// Vídeos hospedados no Mux (https://mux.com): o painel envia o arquivo direto do navegador para o Mux
// (upload direto, sem passar pelo servidor do Olwe), o Mux converte para HLS adaptativo e o player toca
// https://stream.mux.com/<playback id>.m3u8. Com uma chave de assinatura configurada, os vídeos novos
// ficam privados (playback "signed") e cada sessão do player recebe um link que vence em poucas horas.

const API = "https://api.mux.com";
const TOKEN_HOURS = 6;

export function muxEnabled() {
  return !!process.env.MUX_TOKEN_ID && !!process.env.MUX_TOKEN_SECRET;
}

// Chave de assinatura: aceita os nomes do Olwe e os do SDK/painel do Mux (MUX_SIGNING_KEY, MUX_PRIVATE_KEY).
const signingKeyId = () => process.env.MUX_SIGNING_KEY_ID || process.env.MUX_SIGNING_KEY || "";
const signingKeyPrivate = () => (process.env.MUX_SIGNING_KEY_PRIVATE || process.env.MUX_PRIVATE_KEY || "").trim();

/** Vídeos novos com playback assinado (ID e chave privada da Signing Key do Mux). */
export function muxSigning() {
  return !!signingKeyId() && !!signingKeyPrivate();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

async function mux(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<Raw> {
  const auth = Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString("base64");
  const res = await fetch(API + path, {
    method,
    headers: { authorization: `Basic ${auth}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 204) return {};
  const data = (await res.json().catch(() => ({}))) as Raw;
  if (!res.ok) {
    console.error("[mux]", method, path, res.status, data?.error ?? data);
    throw new Error(`Mux ${res.status}`);
  }
  return data.data ?? {};
}

/** Cria o endereço de upload direto (o navegador envia o arquivo para lá). */
export async function createDirectUpload(origin: string) {
  const data = await mux("POST", "/video/v1/uploads", {
    cors_origin: origin,
    new_asset_settings: {
      playback_policies: [muxSigning() ? "signed" : "public"],
      // "basic" não cobra a codificação; "plus" tem qualidade maior (MUX_VIDEO_QUALITY).
      video_quality: process.env.MUX_VIDEO_QUALITY === "plus" ? "plus" : "basic",
    },
  });
  return { id: String(data.id), url: String(data.url) };
}

export type UploadState = { status: "uploading" } | { status: "processing" | "ready"; assetId: string } | { status: "error" };

/** Andamento depois do envio: o Mux cria o vídeo (asset) e o prepara para tocar. */
export async function uploadState(uploadId: string): Promise<UploadState> {
  const upload = await mux("GET", `/video/v1/uploads/${encodeURIComponent(uploadId)}`);
  if (["errored", "cancelled", "timed_out"].includes(upload.status)) return { status: "error" };
  if (!upload.asset_id) return { status: "uploading" };
  const asset = await getAsset(String(upload.asset_id));
  if (!asset || asset.status === "errored") return { status: "error" };
  return { status: asset.status === "ready" ? "ready" : "processing", assetId: asset.id };
}

export type MuxAsset = { id: string; status: string; playbackId: string | null; signed: boolean; height: number | null; minutes: number | null };

export async function getAsset(assetId: string): Promise<MuxAsset | null> {
  if (!/^[\w-]{1,100}$/.test(assetId)) return null;
  let data: Raw;
  try {
    data = await mux("GET", `/video/v1/assets/${encodeURIComponent(assetId)}`);
  } catch {
    return null;
  }
  const playback = (data.playback_ids ?? []).find((p: Raw) => p.policy === "public") ?? data.playback_ids?.[0];
  const video = (data.tracks ?? []).find((t: Raw) => t.type === "video");
  return {
    id: String(data.id),
    status: String(data.status),
    playbackId: playback ? String(playback.id) : null,
    signed: playback?.policy === "signed",
    height: Number(video?.max_height) || null,
    minutes: Number(data.duration) ? Math.max(1, Math.ceil(Number(data.duration) / 60)) : null,
  };
}

/** Apaga o vídeo no Mux (deixa de ocupar espaço). Falhar aqui não impede a operação no Olwe. */
export async function deleteAsset(assetId: string) {
  try {
    await mux("DELETE", `/video/v1/assets/${encodeURIComponent(assetId)}`);
  } catch {
    // Já apagado ou indisponível: fica para apagar no painel do Mux.
  }
}

let signingKey: KeyObject | null = null;
function key() {
  // O Mux entrega a chave privada em base64 (PEM RSA); colada já como PEM, também vale.
  const raw = signingKeyPrivate();
  signingKey ??= createPrivateKey(raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8"));
  return signingKey;
}

/** Endereço HLS do vídeo; os assinados recebem um token que vence em algumas horas. */
export async function playbackUrl(playbackId: string, signed: boolean) {
  const base = `https://stream.mux.com/${playbackId}.m3u8`;
  if (!signed) return base;
  if (!muxSigning()) return null;
  const token = await new SignJWT({ sub: playbackId, aud: "v" })
    .setProtectedHeader({ alg: "RS256", kid: signingKeyId() })
    .setExpirationTime(`${TOKEN_HOURS}h`)
    .sign(key());
  return `${base}?token=${token}`;
}
