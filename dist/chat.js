// A small, local conversation toy. Messages never leave this page.
export function kittyReply(message, name = 'Nancy', turn = 0) {
  const text = String(message).trim().toLowerCase().replace(/[’]/g, "'");
  const pick = choices => choices[turn % choices.length];
  const reply = (emotion, choices) => ({emotion, text: pick(choices)});
  if (/\b(sad|upset|cry|crying|lonely|bad day|rough day|stress|stressed|not happy|unhappy)\b/.test(text))
    return reply('hug', [`A soft little hug for you, ${name}. We can sit here together for a moment. ♡`, `That sounds like a hard day, ${name}. Let's take one gentle breath and have a cozy little break.`]);
  if (/\b(jump|bounce|excited|celebrate|hooray|yay)\b/.test(text))
    return reply('excited', [`Yaaay, ${name}! This much happy needs three little jumps! ✨`, `One, two, three… happy hops just for you, ${name}!`]);
  if (/\b(dance|dancing|boogie|music)\b/.test(text))
    return reply('dance', [`It's our tiny dance party, ${name}! Wiggle left, wiggle right… ♫`, `A bow, a twirl, and a happy little wiggle. Your turn, ${name}!`]);
  if (/\b(hug|cuddle|love|miss you|kiss|heart)\b/.test(text))
    return reply('hug', [`Sending you the fluffiest little hug, ${name}. You're so loved. ♡`, `A whole room of plushies and one extra hug for you, ${name}! ♡`]);
  if (/\b(tired|sleep|sleepy|bed|good night|goodnight)\b/.test(text))
    return reply('sleepy', [`A tiny yawn… time to rest those busy paws, ${name}. Sweet dreams. ☾`, `Let's get cozy, ${name}. Even little bows need their beauty sleep.`]);
  if (/\b(joke|funny|laugh)\b/.test(text))
    return reply('happy', [`Why did my plushie bring a suitcase? She was ready for a cuddle vacation! Hehe, ${name}.`, `What is a plushie's favorite weather? A little sunshine with a chance of cuddles! ♡`]);
  if (/\b(your name|who are you)\b/.test(text))
    return reply('wave', [`I'm your little Kitty friend, ${name}! I can wave, dance, jump, and share a cozy hug.`]);
  if (/\b(my name|who am i|nancy)\b/.test(text))
    return reply('happy', [`You're ${name}, the special person this little room was made for. ♡`]);
  if (/\b(happy|smile|cute|pretty|beautiful|good|great|thank|thanks|awesome)\b/.test(text))
    return reply('happy', [`You make my little room brighter, ${name}! Here's my happiest smile. ♡`, `Happy eyes, rosy cheeks, and a little smile… all for you, ${name}!`]);
  if (/\b(bye|goodbye|see you)\b/.test(text))
    return reply('wave', [`Bye for now, ${name}! Your little room will be right here when you want to play. ♡`]);
  if (/\b(hi|hello|hey|wave|morning|how are you)\b/.test(text))
    return reply('wave', [`Hi, ${name}! *waves a tiny paw* I'm so happy you're here! 🎀`, `Hello, ${name}! I saved the coziest spot in the room for you. ♡`]);
  return reply('curious', [
    `I'm a little Kitty with a few playful replies, ${name}. Try “dance,” “jump,” or “give me a hug”!`,
    `A curious little head tilt… I know about cuddles, smiles, and tiny dance parties. Which shall we try, ${name}?`
  ]);
}

export const MOODS = {wave:'Waving hello',happy:'Feeling happy',excited:'So excited!',dance:'Tiny dance party',hug:'Sending a hug',sleepy:'Feeling cozy',curious:'Curious little Kitty'};
// Finite poses return exactly to neutral after the reaction, even after a slow frame.
export function avatarPose(emotion, elapsed, reduced = false) {
  const duration = emotion === 'dance' ? 6 : 4.8;
  const active = elapsed >= 0 && elapsed < duration;
  const p = {active, eyes:'open', mouth:'none', lift:0, tilt:0, turn:0, left:-.35, right:.35, squash:1};
  if (!active) return p;
  const fade = Math.min(1, elapsed * 6, (duration-elapsed)*4);
  if (['happy','wave','excited','dance','hug'].includes(emotion)) {p.eyes='happy';p.mouth='smile';}
  if (emotion === 'sleepy') {p.eyes='sleepy';p.mouth='yawn';p.tilt=.1*fade;}
  if (emotion === 'curious') {p.mouth='yawn';p.tilt=-.14*fade;}
  if (reduced) return p;
  if (emotion === 'wave') p.right=.35+(1.65+Math.sin(elapsed*8)*.22)*fade;
  if (emotion === 'happy') {p.tilt=Math.sin(elapsed*3)*.07*fade;p.lift=Math.abs(Math.sin(elapsed*2))*.04*fade;}
  if (emotion === 'excited') {p.lift=Math.abs(Math.sin(Math.min(elapsed,3)*Math.PI))*.48*fade*(elapsed<3?1:0);p.left=-.35-1.7*fade;p.right=.35+1.7*fade;p.squash=1-Math.max(0,Math.cos(elapsed*Math.PI*2))*.04*fade*(elapsed<3?1:0);}
  if (emotion === 'dance') {p.turn=Math.sin(elapsed*4)*.36*fade;p.tilt=Math.sin(elapsed*4)*.12*fade;p.lift=Math.abs(Math.sin(elapsed*4))*.12*fade;p.left=-.35+(-.45-Math.sin(elapsed*4)*.4)*fade;p.right=.35+(.45-Math.sin(elapsed*4)*.4)*fade;}
  if (emotion === 'hug') {p.left=.75*fade-.35*(1-fade);p.right=-.75*fade+.35*(1-fade);p.tilt=Math.sin(elapsed*2)*.07*fade;}
  return p;
}
