/* Generated from the Python boundary schema. Run npm run contracts:generate. */

/**
 * @minItems 1
 * @maxItems 4
 */
export type Tools =
  | [Note | Formula | Diagram | Quiz | Clear]
  | [Note | Formula | Diagram | Quiz | Clear, Note | Formula | Diagram | Quiz | Clear]
  | [
      Note | Formula | Diagram | Quiz | Clear,
      Note | Formula | Diagram | Quiz | Clear,
      Note | Formula | Diagram | Quiz | Clear
    ]
  | [
      Note | Formula | Diagram | Quiz | Clear,
      Note | Formula | Diagram | Quiz | Clear,
      Note | Formula | Diagram | Quiz | Clear,
      Note | Formula | Diagram | Quiz | Clear
    ];
export type Kind = "note";
export type Text = string;
export type Title = string;
export type Explanation = string;
export type Kind1 = "formula";
/**
 * Standard LaTeX; prefer plain F=ma for simple formulas.
 */
export type Latex = string;
export type Title1 = string;
export type Kind2 = "diagram";
export type Mermaid = string;
export type Title2 = string;
/**
 * Copy the exact correct choice text, never a letter or index.
 */
export type Answer = string;
/**
 * Plain choices without A/B labels. Exactly one correct; others must be false, not equivalent rearrangements.
 *
 * @minItems 2
 * @maxItems 4
 */
export type Choices = [string, string] | [string, string, string] | [string, string, string, string];
export type Explanation1 = string;
export type Kind3 = "quiz";
/**
 * A short learner-facing question, never a copied request.
 */
export type Question = string;
export type Kind4 = "clear";
export type ConversationId = string;
export type SchemaVersion = 1;
export type Avatar = "mira-photo" | "mira" | "portrait" | "orbit" | "lumen";
export type Model = "qwen2.5:0.5b" | "qwen2.5:1.5b" | "qwen2.5:7b";
export type Voice = "af_heart" | "af_bella" | "am_michael" | "bf_emma";
export type Token = string;
export type ConversationId1 = string;
export type Token1 = string;
export type Type = "hello";
export type Sdp = string;
export type Type1 = "offer";
export type Teach = boolean;
export type Text1 = string;
export type Type2 = "ask";
export type Enabled = boolean;
export type Type3 = "teach_mode";

export interface ControlContract {
  board: BoardReply;
  created: CallCreated;
  hello: Hello;
  offer: Offer;
  question: Question1;
  settings: CallSettings;
  teach_mode: TeachMode;
}
export interface BoardReply {
  tools: Tools;
}
export interface Note {
  kind: Kind;
  text: Text;
  title: Title;
}
export interface Formula {
  explanation: Explanation;
  kind: Kind1;
  latex: Latex;
  title: Title1;
}
export interface Diagram {
  kind: Kind2;
  mermaid: Mermaid;
  title: Title2;
}
export interface Quiz {
  answer: Answer;
  choices: Choices;
  explanation: Explanation1;
  kind: Kind3;
  question: Question;
}
export interface Clear {
  kind: Kind4;
}
export interface CallCreated {
  conversation_id: ConversationId;
  schema_version?: SchemaVersion;
  settings: CallSettings;
  token: Token;
}
export interface CallSettings {
  avatar?: Avatar;
  model?: Model;
  voice?: Voice;
}
export interface Hello {
  conversation_id: ConversationId1;
  token: Token1;
  type: Type;
}
export interface Offer {
  sdp: Sdp;
  type: Type1;
}
export interface Question1 {
  teach?: Teach;
  text: Text1;
  type: Type2;
}
export interface TeachMode {
  enabled: Enabled;
  type: Type3;
}
