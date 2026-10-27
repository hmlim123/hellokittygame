// Frame-rate independent easing keeps interrupted expressions continuous.
export const soften = (current, target, seconds, speed = 7) => current + (target-current) * (1-Math.exp(-speed*Math.max(0,seconds)));
export function blinkAmount(seconds) {
  if(seconds<=0 || seconds>=.24)return 0;
  // Quick closing, slower opening, with no abrupt eyelid switch.
  const phase=seconds<.085?seconds/.085:1-(seconds-.085)/.155;
  return phase*phase*(3-2*phase);
}
export function expressionTarget(emotion, active, elapsed=0) {
  const happy=['happy','wave','excited','dance','hug'].includes(emotion);
  // Smile with the eyes briefly, then relax back to recognizable oval eyes.
  const eyeSmile=active?Math.max(0,Math.sin(Math.min(1,Math.max(0,elapsed)/3.8)*Math.PI)):0;
  return {
    joy:happy?(emotion==='excited'?.94:emotion==='happy'?.85:.64)*eyeSmile:0,
    smile:happy?(active?(emotion==='hug'?.62:.9):.42):0,
    sleepy:emotion==='sleepy'?(active?.88:.45):0,
    yawn:emotion==='sleepy'&&active?Math.max(0,Math.sin(Math.min(1,elapsed/3.6)*Math.PI))*.8:0,
    warmth:happy?(active?1:.45):emotion==='sleepy'?.2:0
  };
}
