/**
 * Fotó-belépési pont a mentéshez (kliens-oldal). A képet a jóváhagyásig
 * a sessionStorage-ban tartjuk (nincs backend feltöltés még); a megerősítő
 * képernyő innen olvassa és jeleníti meg. A valós tárolás + AI-elemzés a
 * Supabase-szakaszban jön; addig is a felhasználó MINDIG jóváhagy.
 */
export const PHOTO_KEY = "elmentve_foto";

export function storePhoto(file: File): Promise<void> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(PHOTO_KEY, String(reader.result));
      } catch {
        /* a tár tele lehet; a flow enélkül is működik */
      }
      resolve();
    };
    reader.onerror = () => resolve();
    reader.readAsDataURL(file);
  });
}

export function readPhoto(): string | null {
  try {
    return sessionStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

export function clearPhoto() {
  try {
    sessionStorage.removeItem(PHOTO_KEY);
  } catch {
    /* ignore */
  }
}
