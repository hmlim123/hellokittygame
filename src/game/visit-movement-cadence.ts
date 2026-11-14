/** Publish a final stationary sample so peers don't retain inferred walking speed. */
export class VisitMovementCadence {
  private key = "";
  private sentAt = -Infinity;
  private needsStop = false;
  private position: { x: number; z: number };

  constructor(position: { x: number; z: number }) {
    this.position = { x: position.x, z: position.z };
  }

  shouldSend(key: string, position: { x: number; z: number }, now: number) {
    const moved = position.x !== this.position.x || position.z !== this.position.z;
    if (key === this.key && !moved && !this.needsStop && now - this.sentAt < 15000)
      return false;
    this.needsStop = moved;
    this.key = key;
    this.sentAt = now;
    this.position = { x: position.x, z: position.z };
    return true;
  }
}
