import { describe, it, expect, vi, afterEach } from "vitest";
import { visitServerUrl, parseVisitLink, invitationLink } from "./visits";
const origin = "https://hmlim123.github.io";
const invite = {
  server: "https://nancy-village.onrender.com",
  roomId: "0123456789abcdef",
  invite: "a".repeat(43),
};
afterEach(() => vi.unstubAllEnvs());
describe("private visit invitations", () => {
  it("accepts an HTTPS Render service and limits plain HTTP to local development", () => {
    expect(visitServerUrl(invite.server, origin)).toBe(invite.server);
    for (const url of [
      "http://nancy-village.onrender.com",
      "https://unknown.example",
      "https://name:secret@nancy-village.onrender.com",
      "https://nancy-village.onrender.com/other",
      "https://nancy-village.onrender.com?token=x",
      "http://127.0.0.1:8787",
    ])
      expect(visitServerUrl(url, origin)).toBe("");
    expect(
      visitServerUrl("http://127.0.0.1:8787", "http://127.0.0.1:8081"),
    ).toBe("http://127.0.0.1:8787");
  });
  it("shares only an invitation, preserves the game subpath and omits reset parameters and host credentials", () => {
    vi.stubEnv("BASE_URL", "./");
    const input = { ...invite, token: "PRIVATE-HOST-TICKET" };
    const link = invitationLink(
      input,
      "https://hmlim123.github.io/hellokittygame/?v=gift-20&update=village-32",
    );
    expect(new URL(link).pathname).toBe("/hellokittygame/adventure.html");
    expect(new URL(link).search).toBe("");
    const decoded = atob(
      new URL(link).hash.slice(7).replace(/-/g, "+").replace(/_/g, "/"),
    );
    expect(decoded).not.toContain("PRIVATE-HOST-TICKET");
    expect(parseVisitLink(link, origin)).toEqual(invite);
  });
  it("rejects malformed, oversized and incomplete invitations", () => {
    for (const value of [
      "#visit=not-json",
      "#visit=" + btoa("{}"),
      "#visit=" + "a".repeat(2500),
      "https://example.com/#visit=x",
    ])
      expect(parseVisitLink(value, origin)).toBeNull();
    const bad = invitationLink(
      { ...invite, invite: "short" },
      "https://hmlim123.github.io/hellokittygame/",
    );
    expect(parseVisitLink(bad, origin)).toBeNull();
  });
});
