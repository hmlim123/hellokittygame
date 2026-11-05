import { DOLLS } from "../game/domain";
import { useGameStore } from "../game/store";
import { prepareKittyStyle } from "./kitty-assets";
let request = 0;
export const cancelFriendSelection = () => {
  request++;
};
export async function chooseShelfFriend(id: number) {
  const token = ++request,
    s = useGameStore.getState(),
    friend = DOLLS.find((d) => d.id === id);
  if (
    !friend ||
    !s.room.owned.includes(id) ||
    s.mode !== "room" ||
    s.viewOnly ||
    s.mission ||
    s.arrival
  )
    return false;
  await prepareKittyStyle(friend.plush || "classic");
  const current = useGameStore.getState();
  if (
    token !== request ||
    current.mode !== "room" ||
    current.viewOnly ||
    current.mission ||
    current.arrival ||
    !current.room.owned.includes(id)
  )
    return false;
  current.setFriend(id);
  return true;
}
