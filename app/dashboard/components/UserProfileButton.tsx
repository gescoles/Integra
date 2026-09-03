"use client";

import { useRef, useState } from "react";
import { ChevronDown, Camera, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useUserAvatar } from "../SchoolContext";
import { uploadMyAvatar } from "../profileActions";
import { eliminarDeviceToken, eliminarWebPushSubscription } from "../notificationsActions";
import { WEB_PUSH_ENDPOINT_KEY } from "./WebPushRegistration";
import { translate, AppLocale } from "../i18n";
import { ButtonSpinner } from "./ButtonSpinner";

// El token push de este dispositivo se guarda en localStorage (por
// PushRegistration.tsx) nada más registrarse — no hay forma de volver a
// pedírselo al plugin más tarde, así que hay que leerlo de ahí. Si no
// existe (navegador normal, o la app nunca llegó a registrar el
// dispositivo), no hace nada.
const DEVICE_TOKEN_KEY = "docentium_push_token";

async function olvidarDispositivoPush() {
  try {
    const token = window.localStorage.getItem(DEVICE_TOKEN_KEY);
    if (token) {
      await eliminarDeviceToken(token);
      window.localStorage.removeItem(DEVICE_TOKEN_KEY);
    }
  } catch {
    // No pasa nada si falla — el cierre de sesión sigue adelante igual.
  }

  try {
    const endpoint = window.localStorage.getItem(WEB_PUSH_ENDPOINT_KEY);
    if (endpoint) {
      await eliminarWebPushSubscription(endpoint);
      window.localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY);
    }
  } catch {
    // No pasa nada si falla — el cierre de sesión sigue adelante igual.
  }
}

export function UserProfileButton({
  userName,
  userEmail,
  roleLabel,
  locale,
}: {
  userName: string;
  userEmail: string;
  roleLabel: string;
  locale: AppLocale;
}) {
  const { avatarUrl, setAvatarUrl } = useUserAvatar();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initials = userName.slice(0, 2).toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleClose() {
    if (pending) return;
    setOpen(false);
    setFile(null);
    setPreview(null);
    setError(null);
  }

  async function handleUpload() {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const url = await uploadMyAvatar(formData);
      setAvatarUrl(url);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FD5249] text-xs font-bold text-white">
            <span>{initials}</span>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userName}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <div className="hidden overflow-hidden text-left leading-tight sm:block">
            <div className="truncate text-[13px] font-semibold text-[#0B1D4D]">{userName}</div>
            <div className="truncate text-[10px] text-slate-400">{roleLabel}</div>
          </div>
          <ChevronDown className={`hidden h-4 w-4 shrink-0 text-slate-400 transition-transform sm:block ${menuAbierto ? "rotate-180" : ""}`} />
        </button>

        {menuAbierto && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <div className="truncate text-sm font-semibold text-[#0B1D4D]">{userName}</div>
                <div className="truncate text-xs text-slate-400">{roleLabel}</div>
                <div className="mt-1 truncate text-xs text-slate-400">{userEmail}</div>
              </div>
              <button
                onClick={() => {
                  setMenuAbierto(false);
                  setOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <Camera className="h-4 w-4 text-slate-400" /> {translate(locale, "perfil.elegirFoto")}
              </button>
              <button
                onClick={async () => {
                  await olvidarDispositivoPush();
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> {translate(locale, "sidebar.cerrarSesion")}
              </button>
            </div>
          </>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "perfil.fotoDePerfil")}</h2>
              <button
                onClick={handleClose}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 flex flex-col items-center gap-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-4 ring-slate-50">
                {preview || avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview ?? avatarUrl ?? ""}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#FD5249] text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Camera className="h-3.5 w-3.5" /> {translate(locale, "perfil.elegirFoto")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-[11px] text-slate-400">{translate(locale, "perfil.formatoAyuda")}</p>
            </div>

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {translate(locale, "common.cancelar")}
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || pending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
              >
                {pending && <ButtonSpinner />}
                {pending ? translate(locale, "common.guardando") : translate(locale, "common.guardar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
