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
export type Avatar = "einstein" | "einstein-portrait" | "mira-photo" | "mira" | "portrait" | "orbit" | "lumen";
export type Model = string;
export type ProviderId = string;
export type Voice = "af_heart" | "af_bella" | "am_michael" | "bf_emma";
export type TeachingAvailable = boolean;
export type Token = string;
export type ConversationId1 = string;
export type Token1 = string;
export type Type = "hello";
export type Sdp = string;
export type Type1 = "offer";
export type ApiKey = string | null;
export type Endpoint = string;
export type Id = string;
export type Kind5 = "compatible" | "openrouter";
export type MaxOutputTokens = number;
export type Model1 = string;
export type ModelIdentity = "provider_declared";
export type Name = string;
export type RequiresKey = boolean;
export type Teaching = boolean;
export type TermsUrl = string | null;
export type TimeoutSeconds = number;
export type RemoveKey = boolean;
export type CredentialConfigured = boolean;
export type Evidence = "experimental";
export type Ready = boolean;
export type Reason = string;
export type Providers = ProviderView[];
export type SchemaVersion1 = 1;
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
  provider_write: ProviderWrite;
  providers: ProviderList;
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
  teaching_available?: TeachingAvailable;
  token: Token;
}
export interface CallSettings {
  avatar?: Avatar;
  model?: Model;
  provider_id?: ProviderId;
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
export interface ProviderWrite {
  api_key?: ApiKey;
  configuration: ProviderConfiguration;
  remove_key?: RemoveKey;
}
export interface ProviderConfiguration {
  endpoint: Endpoint;
  id: Id;
  kind?: Kind5;
  max_output_tokens?: MaxOutputTokens;
  model: Model1;
  model_identity?: ModelIdentity;
  name: Name;
  requires_key?: RequiresKey;
  teaching?: Teaching;
  terms_url?: TermsUrl;
  timeout_seconds?: TimeoutSeconds;
}
export interface ProviderList {
  providers: Providers;
  schema_version?: SchemaVersion1;
}
export interface ProviderView {
  configuration: ProviderConfiguration;
  credential_configured: CredentialConfigured;
  evidence?: Evidence;
  ready: Ready;
  reason: Reason;
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
