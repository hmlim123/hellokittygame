import { version } from "../../package.json";
export const RELEASE_VERSION = version;
export const BUILD_REVISION = import.meta.env.VITE_BUILD_REVISION || "local";
