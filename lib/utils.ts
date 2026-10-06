import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Tiền tố đường dẫn khi deploy dưới thư mục con (vd: GitHub Pages /Tinhvan). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Bỏ tiền tố basePath khỏi pathname để so khớp với href nội bộ. */
export function stripBasePath(pathname: string): string {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    const rest = pathname.slice(BASE_PATH.length);
    return rest === "" ? "/" : rest;
  }
  return pathname;
}
