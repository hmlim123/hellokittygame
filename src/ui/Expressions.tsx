import type { FaceExpression } from "../game/types";
export const EXPRESSIONS: [FaceExpression, string][] = [["sleepy", "Sleepy"], ["surprised", "Surprised"], ["softHappy", "Happy squint"], ["shy", "Bashful"], ["curious", "Curious"]];
export function Expressions({onPreview}: {onPreview: (kind: FaceExpression) => void}) {
 return <details className="expression-picker"><summary>More little expressions</summary><div className="plush-preview-actions" aria-label="Kitty’s expressions">{EXPRESSIONS.map(([kind,label])=><button type="button" key={kind} onClick={()=>onPreview(kind)}>{label}</button>)}</div></details>;
}
