import {
  encode as base62encode,
  decode as base62decode,
} from "@urlpack/base62";

export function encodePostId(uuid: string) {
  return base62encode(Buffer.from(uuid.replaceAll("-", ""), "hex"));
}

export function decodePostId(id: string) {
  return Buffer.from(base62decode(id)).toString("hex");
}
