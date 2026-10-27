import test from 'node:test';
import assert from 'node:assert/strict';
import {kittyReply, avatarPose, MOODS} from '../dist/chat.js';

test('typed greetings, feelings and actions produce the matching reaction for Nancy',()=>{
  for(const [message,mood] of [['Hi Kitty!','wave'],["I'm happy!",'happy'],['Jump!','excited'],["Let's dance!",'dance'],['Give me a hug','hug'],['Good night','sleepy'],['What is your name?','wave']]) {
    const result=kittyReply(message);assert.equal(result.emotion,mood,message);assert.match(result.text,/Nancy/);
  }
});
test('sadness and negated happiness receive comfort before cheerful keywords match',()=>{
  for(const message of ["I'm not happy",'I had a bad day','I am sad but thank you'])assert.equal(kittyReply(message).emotion,'hug');
  assert.equal(kittyReply('This is a ship').emotion,'curious');
});
test('unrecognized messages have an honest playable fallback, with recipient overrides',()=>{
  assert.match(kittyReply('quantum physics','Nana').text,/Nana/);
  assert.match(kittyReply('quantum physics').text,/playful replies/);
  assert.notEqual(kittyReply('hi','Nancy',0).text,kittyReply('hi','Nancy',1).text);
});
test('reactions visibly smile and jump then reset without leaving limbs or face stuck',()=>{
  assert.equal(avatarPose('happy',1).mouth,'smile');assert.equal(avatarPose('happy',1).eyes,'happy');
  assert.ok(avatarPose('excited',.5).lift>.4);assert.ok(avatarPose('wave',1).right>1);
  for(const mood of Object.keys(MOODS))assert.deepEqual(avatarPose(mood,30),avatarPose(null,-1));
});
test('reduced motion preserves expressions while suppressing jumps, waves and dances',()=>{
  for(const mood of Object.keys(MOODS)){const pose=avatarPose(mood,1,true);assert.equal(pose.lift,0);assert.equal(pose.turn,0);assert.equal(pose.left,-.35);assert.equal(pose.right,.35);}
  assert.equal(avatarPose('excited',1,true).mouth,'smile');
});
