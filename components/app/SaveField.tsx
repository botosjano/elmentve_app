"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send, ImagePlus } from "lucide-react";
import { storePhoto } from "@/lib/photo";

const EXAMPLE = "Jövő hét kedden orvoshoz megyek, emlékeztess időben.";

/**
 * Természetes-nyelvű mentőmező (a termék fő beviteli élménye) + fotó-belépés.
 * A beküldés a megerősítő képernyőre visz, ahol a felhasználó KÖTELEZŐEN
 * jóváhagyja a felismert adatokat. Az AI sosem ment észrevétlenül.
 */
export function SaveField() {
  const router = useRouter();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = text.trim();
    if (!q) return;
    router.push(`/app/megerosites?q=${encodeURIComponent(q)}`);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await storePhoto(file);
    router.push("/app/megerosites?foto=1");
  };

  return (
    <div className="panel p-5 sm:p-6">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={2}
        placeholder="Írd le, mit szeretnél elmenteni vagy mire kérsz emlékeztetőt…"
        className="w-full resize-none bg-transparent text-[17px] leading-relaxed text-ink outline-none placeholder:text-lilac/80 sm:text-lg"
      />
      <div className="mt-2 border-t border-panel-line pt-3 text-[13px] text-muted">
        <span className="text-muted/80">Példa: </span>
        {EXAMPLE}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {/* Fotó-belépés: fotózz le egy nyugtát/dokumentumot, mi feldolgozzuk. */}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-panel-line bg-white/70 px-4 py-3 text-sm font-semibold text-indigo transition-colors hover:border-lilac hover:bg-lilac/5"
        >
          <ImagePlus className="h-5 w-5 text-lilac" /> Fotó feltöltése
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Diktálás"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-panel-line bg-lilac/10 text-lilac transition-colors hover:bg-lilac/15"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="cta flex h-12 items-center gap-2 px-6 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-[#05372d]">Mentés</span>
            <Send className="h-4 w-4 text-[#05372d]" />
          </button>
        </div>
      </div>
    </div>
  );
}
