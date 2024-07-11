import {
  encode as base62encode,
  decode as base62decode,
} from "@urlpack/base62";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function encodePostId(uuid: string) {
  return base62encode(Buffer.from(uuid.replaceAll("-", ""), "hex"));
}

export function decodePostId(id: string) {
  return Buffer.from(base62decode(id)).toString("hex");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
