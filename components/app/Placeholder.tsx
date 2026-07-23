import { Clock } from "lucide-react";

/** Ideiglenes tartalom a még nem elkészült képernyőkhöz (következő kártyák). */
export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h1 className="mb-6 text-[2rem] font-medium tracking-tight text-ink sm:text-[2.5rem]">{title}</h1>
      <div className="panel flex items-center gap-3 px-5 py-6 text-muted">
        <Clock className="h-5 w-5 shrink-0 text-lilac" />
        <p className="text-[15px]">{note}</p>
      </div>
    </div>
  );
}
