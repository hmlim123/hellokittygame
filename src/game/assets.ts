import { RELEASE_VERSION } from "./release";
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path}${path.endsWith(".glb") || path.startsWith("assets/plush/") ? `?v=${RELEASE_VERSION}` : ""}`;
