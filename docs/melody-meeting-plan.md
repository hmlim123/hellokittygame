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
   [Private visit setup](private-visits-setup.md)
2. Meet by the plaza. Wave, smile, and send each other a short message. Walk a
   little in different directions so you can each see the other character move.
3. Walk together to the picnic table. One of you lays the cloth, the other brings
   cookies, and either can pour the tea. Both should see the same finished table.
   For another visit, try baking the cookies together before bringing them to
   the picnic.
4. Take a framed photo together when the shared photo controls are available.
   Either of you can download it. Nancy can choose to display it on her wall.
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
acceptance check. The public Worker address is documented, but a health request
from this workspace returned HTTP 403, so hosted capability and real account
readiness still need verification. [Account browser test](../tests/accounts-browser.py) ·
[Private visit browser test](../tests/visits-browser.py) ·
[Hosted service setup](private-visits-setup.md#updating-an-existing-village-for-v37)

## Activities for repeat visits

Start with the picnic. Next, make the activities already in the code easy to
start from the village. Add the later activities one at a time after the meeting
and reconnect flow is dependable.

| Order | Activity | What Nancy and Melody do |
| --- | --- | --- |
| First visit | Plaza hello | Walk freely, wave and smile at each other, chat in speech bubbles, and try the synchronized dance. |
| First visit | Picnic for two | Meet at the table and share the cloth, cookies, and tea tasks. Stay and chat once the table is ready. |
| Next | Pip’s garden | Split the flower beds between you. See each bloom appear for both players as it’s watered. |
| Next | Bake together | Nancy mixes and presents while Melody decorates. Bring the finished cookies to the shared picnic. |
| Next | Dance and high-five | Use the existing paired gestures and choose a spot in the plaza to celebrate together. |
| Next | Village photo | Pick a pose, share a countdown, and download a framed PNG. Try sunshine or sunset for another visit. |
| Later | Bench tea | Meet at a bench or picnic table. One player pours, the other offers a cookie, then both can sit and sip while chatting. |
| Later | Postcard walk | Pick one village landmark each. Walk to both, add a stamp from each stop, and save the two-stamp postcard. |
| Later | Lantern evening | Choose a lantern color each, light the lanterns together, and take a photo in the evening village. |
| Later | A village clue trail | Give each player a different clue. Share the clues in chat, then meet at the landmark they point to. |

Wave, smile, chat, and the shared dance are implemented in the village. The
picnic, garden, paired gestures, cooperative baking, weather, and photos already
have game or service support. The next pass should connect those pieces into
easy visits on the existing map. [Village social controls](../src/ui/VillageSocial.tsx) ·
[Shared activity rules](../shared/visit-actions.mjs) ·
[Production plan](production-plan.md#in-village-private-interactions--v371)

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
