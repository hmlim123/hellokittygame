import { useState } from "react";
import { useAccounts, accountSession } from "../game/accounts";
import {
  useVisitsStore,
  accountInvitationLink,
  parseVisitLink,
} from "../game/visits";

/** Account setup is separate from Nancy’s local game save and gift-opening marker. */
export function AccountAccess({
  server,
  active,
}: {
  server: string;
  active: boolean;
}) {
  const accounts = useAccounts(),
    visits = useVisitsStore(),
    session = accountSession(server);
  const [profile, setProfile] = useState<"nancy" | "melody">(
    accounts.pendingInvite ? "melody" : "nancy",
  );
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [setupKey, setSetupKey] = useState("");
  const [registrationLink, setRegistrationLink] = useState(""),
    [joinLink, setJoinLink] = useState(""),
    [formError, setFormError] = useState("");
  const [register, setRegister] = useState(!!accounts.pendingInvite),
    [copied, setCopied] = useState(false);
  const setup = !accounts.initialized && !register;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if ((setup || register) && password !== confirm) {
      setFormError("Please enter the same password twice.");
      return;
    }
    const path = setup ? "setup" : register ? "register" : "login";
    const ok = await accounts.signIn(server, path, {
      profile,
      password,
      ...(setup ? { setupKey } : {}),
      ...(register ? { invite: accounts.pendingInvite } : {}),
    });
    if (ok) {
      setRegister(false);
      setPassword("");
      setConfirm("");
      setSetupKey("");
    }
  };
  return (
    <section className="account-access" aria-label="Private player accounts">
      {(accounts.error || formError) && (
        <p className="visit-error" role="alert">
          {formError || accounts.error}
        </p>
      )}
      {session ? (
        <>
          <p className="visit-connection" role="status">
            Signed in as {session.profile.name} ·{" "}
            {session.profile.character === "melody"
              ? "My Melody"
              : "Hello Kitty"}{" "}
            ♡
          </p>
          {!active &&
            accounts.melodyRegistered &&
            accounts.togetherAvailable && (
              <button
                className="primary wide"
                disabled={visits.status === "connecting"}
                onClick={() => void visits.meet()}
              >
                {visits.status === "connecting"
                  ? "Meeting together…"
                  : "Meet together ♡"}
              </button>
            )}
          {!active &&
            (session.profile.id === "nancy" ? (
              <button
                className="primary wide"
                disabled={visits.status === "connecting"}
                onClick={() => void visits.host("Nancy")}
              >
                {visits.status === "connecting"
                  ? "Opening Nancy’s village…"
                  : "Open my village ♡"}
              </button>
            ) : (
              <>
                <p>
                  Nancy is Hello Kitty. You’ll join her as My Melody, with your
                  own login.
                </p>
                {!visits.invitation && (
                  <label className="visit-field">
                    Nancy’s private invitation
                    <input
                      type="url"
                      value={joinLink}
                      onChange={(e) => setJoinLink(e.target.value)}
                    />
                  </label>
                )}
                <button
                  className="primary wide"
                  disabled={
                    visits.status === "connecting" ||
                    (!visits.invitation && !parseVisitLink(joinLink))
                  }
                  onClick={() =>
                    visits.join(
                      "My Melody",
                      visits.invitation ? undefined : joinLink,
                    )
                  }
                >
                  {visits.status === "connecting"
                    ? "Joining Nancy…"
                    : "Join Nancy’s village ♡"}
                </button>
              </>
            ))}
          {session.profile.id === "nancy" &&
            !accounts.melodyRegistered &&
            active && (
              <>
                <p>
                  Invite your My Melody. This private link lets your partner
                  create the second account once.
                </p>
                <button
                  disabled={accounts.busy}
                  onClick={async () => {
                    const invite = await accounts.invite(server);
                    if (invite) {
                      setRegistrationLink(
                        accountInvitationLink(
                          server,
                          invite,
                          visits.link ? parseVisitLink(visits.link) : null,
                        ),
                      );
                      setCopied(false);
                    }
                  }}
                >
                  {accounts.busy
                    ? "Making an invitation…"
                    : "Create My Melody’s account invitation"}
                </button>
                {registrationLink && (
                  <div className="visit-invitation">
                    <label className="visit-field">
                      My Melody’s account invitation
                      <input
                        id="account-invitation"
                        readOnly
                        value={registrationLink}
                        onFocus={(e) => e.target.select()}
                      />
                    </label>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(registrationLink);
                          setCopied(true);
                        } catch {
                          document
                            .querySelector<HTMLInputElement>(
                              "#account-invitation",
                            )
                            ?.select();
                        }
                      }}
                    >
                      {copied ? "Copied ♡" : "Copy account invitation"}
                    </button>
                    <p className="small-note">
                      Private, one use, valid for 24 hours. Creating another
                      replaces this link.
                    </p>
                  </div>
                )}
              </>
            )}
          {visits.status === "connecting" && (
            <button onClick={() => visits.leave()}>Cancel connection</button>
          )}
          <button
            disabled={accounts.busy}
            onClick={async () => {
              visits.leave();
              await accounts.logout();
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <h3>
            {setup
              ? "Prepare your two private accounts"
              : register
                ? "Your My Melody account"
                : "Welcome back ♡"}
          </h3>
          <p>
            {setup
              ? "For the gift’s creator: use the setup key from your village service to create Nancy’s account. Then invite My Melody."
              : register
                ? "Choose your own password. Nancy will meet you as Hello Kitty."
                : "Choose your character and sign in. Your passwords stay separate."}
          </p>
          {!setup && !register && (
            <div className="visit-tabs" aria-label="Choose your account">
              <button
                type="button"
                aria-pressed={profile === "nancy"}
                onClick={() => setProfile("nancy")}
              >
                Nancy · Hello Kitty
              </button>
              <button
                type="button"
                aria-pressed={profile === "melody"}
                onClick={() => setProfile("melody")}
              >
                You · My Melody
              </button>
            </div>
          )}
          {setup && (
            <label className="visit-field">
              Service setup key
              <input
                type="password"
                required
                autoComplete="off"
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
              />
            </label>
          )}
          <input
            type="text"
            autoComplete="username"
            value={setup || profile === "nancy" ? "nancy" : "melody"}
            readOnly
            hidden
          />
          <label className="visit-field">
            Password
            <input
              type="password"
              minLength={setup || register ? 12 : 1}
              maxLength={128}
              required
              autoComplete={
                setup || register ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {(setup || register) && (
            <label className="visit-field">
              Confirm password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}
          {(setup || register) && (
            <p className="small-note">
              Use at least 12 characters. Keep this password somewhere safe.
            </p>
          )}
          <button
            className="primary wide"
            type="submit"
            disabled={accounts.busy}
          >
            {accounts.busy
              ? "Connecting…"
              : setup
                ? "Create Nancy’s account"
                : register
                  ? "Create My Melody’s account"
                  : "Sign in ♡"}
          </button>
          {register && accounts.initialized && (
            <button type="button" onClick={() => setRegister(false)}>
              I already have an account
            </button>
          )}
          {!register && accounts.pendingInvite && (
            <button type="button" onClick={() => setRegister(true)}>
              Use my account invitation
            </button>
          )}
        </form>
      )}
      <p className="small-note">
        Only these two invited accounts can meet here. Visits share the village,
        chat and picnic; Nancy’s letter and personal save stay on her device.
      </p>
    </section>
  );
}
