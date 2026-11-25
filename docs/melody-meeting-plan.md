# Nancy and My Melody · Playing together

**Nancy plays Hello Kitty. You play My Melody.** Each of you signs in on your own
device and controls your own character. The first goal is to meet in Nancy’s
private village, see and talk to each other, and finish a picnic you both helped
put together.

## Your first visit

1. Open **Visit the village → Private visits** and sign in to your respective
   accounts. Choose **Meet together** if it appears. With the invitation flow,
   Nancy chooses **Open my village** and shares the private visit link with you.
   First-time My Melody registration uses the separate account invitation.
   [Open the hosted village](https://hmlim123.github.io/hellokittygame/adventure.html?visits=https%3A%2F%2Fhellokittygame.hmbest77.workers.dev) ·
   [Private visit setup](private-visits-setup.md)
2. Meet by the plaza. Wave, smile, and send each other a short message. Walk a
   little in different directions so you can each see the other character move.
3. Each choose **Picnic** to walk to the table. One of you lays the cloth,
   the other brings cookies, and either can pour the tea. Choose **Enjoy the
   picnic** to raise your cup and chat in the village. Try **Bake together**
   under **Activities** to prepare the cookies as a pair.
4. Under **Activities**, choose **A photo together**. Pick a pose and start
   the countdown. Either of you can download the photo, and Nancy can keep it
   on her wall.
   [Shared activities in the game](../src/ui/TogetherActivities.tsx)

## First 90 minutes of development

| Time | Work | What to check |
| --- | --- | --- |
| 0–20 min | Run the two-account test against the local Cloudflare runtime. Check the existing hosted connection and the capability that enables **Meet together**. | Kitty and Melody appear in the same village. Record the exact step if either player gets stuck. |
| 20–55 min | Fix the first reproducible issue with joining, seeing your partner, or reconnecting. If those already work, make the existing **Walk to the picnic table** action easy to find once both players are in the village. | Each player can tell whether the other is waiting, here, or reconnecting. Both can reach the picnic using the existing route. |
| 55–80 min | Play the visit from two independent phone-sized browser sessions. Walk, wave, chat, dance, and take one contribution each at the picnic. Refresh one device midway and finish together. | Each player sees the other’s actions. Picnic progress survives the refresh, and both browsers retain their own personal saves. |
| 80–90 min | Update the draft PR with the test results and the simplest steps for Nancy and Melody to try it on two real devices. | Record the client and service versions used, any issue still blocking a hosted visit, and the next activity to work on. |

The repository includes a two-account browser test, an invite-and-picnic
browser test, and a Cloudflare runtime suite. Local browser tests use temporary
accounts and phone-sized emulation. A real two-device visit is the hosted
acceptance check. [Account browser test](../tests/accounts-browser.py) ·
[Private visit browser test](../tests/visits-browser.py) ·
[Hosted service setup](private-visits-setup.md#updating-an-existing-village-for-v37)

## First picnic check · November 23, 2026

The draft puts a **Picnic** button beside **Wave**, **Smile**, and **Chat** once
both players are in the village. Each player can use it to walk to their spot
at the table and open the shared activity.

The production build and all 286 rule and service checks passed. In two
390×844 Chromium sessions against the local Worker, Nancy and My Melody signed
in, walked, exchanged messages and gestures, and danced together. Nancy laid the
cloth, Melody refreshed and reopened the same picnic, and both saw the finished
table after they added the cookies and tea. [Account browser test](../tests/accounts-browser.py)

The published GitHub Pages client is v3.7.2 and includes **Meet together**.
The production Cloudflare Worker returned a healthy response and, for the
published game origin, reported that Nancy’s account is initialized, My Melody
is registered, and **Meet together** is supported. The new **Picnic** button is
in the draft client. A hosted playthrough with both players on their own devices
remains pending. [GitHub Pages release](https://github.com/hmlim123/hellokittygame/actions/runs/44675763272) ·
[Hosted service setup](private-visits-setup.md#updating-an-existing-village-for-v37)

## Extended visit activities

- **Garden** walks Nancy and My Melody to separate spots by Pip’s flower beds.
  Both players see the same bloom count, and each can water a different bed.
- **Picnic tea** keeps the village visible after the table is set. Each player
  has their own cup and can raise it or use the village chat. Table setup stays
  available for checking what’s been placed.
- **Baking** brings the next player’s turn into the village controls. Nancy
  starts mixing, Melody decorates, and Nancy presents the cookies.
- **Photos** retain the outfit, pose, and weather captured in the image. Both
  can download, and Nancy can keep each photo on her wall once. If the other
  player is too far away, the photo menu offers a route to them.
- **Postcard walk** gives each player a landmark to choose. Visit both stops
  together, add the stamps, and download the postcard. Nancy can also keep it
  on her wall.
- **Lantern evening** gives each player a color and a lantern to light in the
  plaza. Lighting both brings on the same sunset in both browsers.
- **Village clue trail** gives each player a private clue. Share your clues,
  agree on the landmark, and find a ribbon each after both arrive. Another
  round gives the pair a different landmark. A prompt opens your clue when
  your partner shares theirs.
- **Petal Match** lets both players secretly pick a flower. The game reveals
  the colors together and counts shared matches across rounds in the visit.
  Look for **Pick your petal** after your partner chooses.
- **Bench tea** gives both players a seat west of the plaza. Open **Activities →
  Bench tea**, walk to your spot, and sit. Each player chooses **Ready to toast**
  to raise both cups together. You can chat at the bench and stand up whenever
  you’re ready to walk again.
- **Little Village Market** gives you and Nancy three orders to fill at
  the stall north of the plaza. Under **Activities → Little Village Market**,
  walk to your spots and open the stall. One of you reads the order ticket and
  wraps a treat. The other uses the stock shelf to choose a drink. Tell each
  other what to wrap in the stall chat, then each choose **Hand over my parcel**.
  Swap jobs for the next customer. At closing, both of you can download the
  same market keepsake.

Postcard walks, lantern evenings, the clue trail, Petal Match, bench tea, and the
market use shared state from the existing Worker. Their controls appear when
that Worker has been updated. The upgrade uses the existing service and SQLite data.
[Updating the existing village service](private-visits-setup.md#updating-an-existing-village-for-v37)

## Two-player verification · November 24, 2026

The production build and 294 automated checks passed. Two phone-sized Chromium
sessions and two WebKit sessions using the iPhone 15 profile played through
picnic setup and refresh, tea, the shared garden, baking turns, both photo
downloads, the stamped postcard, and the lantern sunset. Both sessions returned
to the same visit after reconnecting. [Two-account browser test](../tests/accounts-browser.py)

The Activities panel is reachable at 320×568 and 844×390. A separate picnic
check held back the last few position updates, then applied a server correction
after Nancy opened the picnic. The picnic dialog stayed open, both players
reached their assigned spots, and they could enter the tea view together.

An upgrade rehearsal started with the published Worker revision and one
temporary SQLite database. The updated Worker reopened both account sessions
with their original visit tickets and restored the shared garden and unfinished
picnic. The draft client also joined with the published Worker and played the
picnic while the newer activities were hidden. [GitHub service check](https://github.com/hmlim123/hellokittygame/actions/runs/45468839185)

## Clue trail and Petal Match verification · November 24, 2026

The production build, 297 automated checks, and full two-player Chromium visit
passed. In Chromium and WebKit, the clues stayed private until shared, the
players could revise a wrong guess, and each could collect one visible ribbon. The
flower choices stayed hidden through a refresh, and the pair completed both
matching and mismatched rounds. The active clue menu stayed reachable at
320×568 and 844×390 in WebKit. [Two-account browser test](../tests/accounts-browser.py)

The Cloudflare and Node tests restored in-progress rounds after a service
restart. A separate upgrade rehearsal reopened existing accounts and village
progress from the published Worker’s SQLite data before starting the new
activities. The published client could join, chat, and start a picnic with the
updated Worker. The updated client could join and start a picnic with the
published Worker. [GitHub service check](https://github.com/hmlim123/hellokittygame/actions/runs/45479608520)

## Bench tea verification · November 24, 2026

The production build and 301 automated checks passed. Two WebKit sessions
using the iPhone 15 profile walked to their seats, sat, and raised their cups
together. Nancy’s readiness stayed set while Melody refreshed and returned to
her seat. Standing restored the village controls. The Cloudflare test also
restored both seats and Nancy’s readiness after a Worker restart. The shared
rules test verifies that standing during a toast cancels it. The toast and
stand controls stayed reachable in WebKit at 320×568 and 844×390.
[Two-account browser test](../tests/accounts-browser.py)

The complete two-account Chromium visit passed, including the earlier
activities, both personal saves, and sign-out and rejoin.

The draft client also joined a private visit with the published Worker revision.
The players could set up a picnic, and the bench tea menu stayed hidden until
the Worker supports it.

## Little Village Market verification · November 25, 2026

The production build and 305 automated checks passed. Two Chromium sessions
walked to the stall, received different views of the same order, coordinated in
the stall chat, corrected a mix-up, swapped jobs, and downloaded identical PNG
keepsakes after three orders. A refresh preserved the parcel already on the
counter. A Cloudflare Worker restart also preserved the ticket and parcel.
[Two-account browser test](../tests/accounts-browser.py)

Two WebKit sessions using the iPhone 15 profile completed the same shift and
both downloads. The market controls stayed reachable at 320×568 and 844×390.
The full Chromium visit passed through the previous activities, market, both
personal saves, sign-out, and rejoin. The draft client joined the published
Worker and played a picnic with the market control hidden.

## Market stall improvements · November 25, 2026

Open **Activities → Little Village Market** and choose **Invite to the market**.
Your partner can join from the village controls or choose **Not now**. Joining
sets a walking route to their spot and opens the workbench on arrival. An
unanswered invitation stays available through a refresh.

The workbench keeps the village in view. One player gets the order ticket and
the other gets the stock shelf. Both see the wrapping, the parcel landing on
the counter, and the customer collecting the order. A mix-up returns the
parcels so the pair can try again. Stall chat and the one-tap drink request stay
beside the order controls.

Each new shift ends with a special from six treat-and-drink combinations. The
next shift draws a different special. An order already under way keeps its
recipe if either player refreshes or the Worker is updated. Each completed
shift still gives both players the same downloadable keepsake.

## Ready for Nancy and Melody

- Both accounts join the same invite-only village with the correct Blender
  characters. Each player can move independently and see the other walk, wave,
  and chat.
- Each player can contribute to the same picnic. Refreshing one device brings
  that player back to the visit with the picnic at its current step.
- Leaving the visit returns each player to their personal game. Nancy’s room,
  outfits, letter, and earlier progress still load. Shared activities only
  change the village progress they are meant to change.
- Nancy and Melody complete one real visit on two devices before the hosted
  milestone is marked complete. Use the existing GitHub Pages game and
  Cloudflare Worker setup with its current two accounts.
  [Private visit setup](private-visits-setup.md)
