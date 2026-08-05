"use client";

import { useRef, useState } from "react";
import { ChevronRight, Camera, X } from "lucide-react";
import { useUserAvatar } from "../SchoolContext";
import { uploadMyAvatar } from "../profileActions";
import { translate, AppLocale } from "../i18n";
import { ButtonSpinner } from "./ButtonSpinner";

export function UserProfileButton({
  userName,
  roleLabel,
  locale,
}: {
  userName: string;
  roleLabel: string;
  locale: AppLocale;
}) {
  const { avatarUrl, setAvatarUrl } = useUserAvatar();
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
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
      >
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2F6FED] text-[11px] font-bold text-white">
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
        <div className="flex-1 overflow-hidden leading-tight">
          <div className="truncate text-[13px] font-semibold text-white">{userName}</div>
          <div className="truncate text-[10px] text-slate-400">{roleLabel}</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

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
                  <div className="flex h-full w-full items-center justify-center bg-[#2F6FED] text-2xl font-bold text-white">
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
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
