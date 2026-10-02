/* Generated from the Python boundary schema. Run npm run contracts:generate. */

export type Event =
  | SessionEvent
  | TextEvent
  | AudioEvent
  | AvatarEvent
  | CanvasEvent
  | InterruptEvent
  | PlaybackStoppedEvent
  | ErrorEvent;
export type ConversationId = string;
export type GenerationId = number;
export type SchemaVersion = 1;
export type Sequence = number;
export type State = "created" | "preparing" | "ready" | "active" | "ending" | "ended" | "failed";
export type Type = "session";
export type ConversationId1 = string;
export type GenerationId1 = number;
export type SchemaVersion1 = 1;
export type Sequence1 = number;
export type Text = string;
export type Type1 = "text";
export type Channels = number;
export type ConversationId2 = string;
export type DataB64 = string;
export type Format = "pcm_s16le";
export type GenerationId2 = number;
export type PresentationSample = number;
export type SampleRate = number;
export type SchemaVersion2 = 1;
export type Sequence2 = number;
export type Type2 = "audio";
export type UtteranceId = string;
/**
 * @minItems 52
 * @maxItems 52
 */
export type Coefficients = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];
export type ConversationId3 = string;
export type Format1 = "arkit52.v1";
export type GenerationId3 = number;
export type PresentationSample1 = number;
export type Renderer = string;
export type SchemaVersion3 = 1;
export type Sequence3 = number;
export type Type3 = "avatar";
export type UtteranceId1 = string;
export type ConversationId4 = string;
export type GenerationId4 = number;
export type OperationId = string;
export type JsonValue = unknown;
export type PayloadVersion = 1;
export type PresentationSample2 = number;
export type SchemaVersion4 = 1;
export type Sequence4 = number;
export type ToolName = string;
export type Type4 = "canvas";
export type UtteranceId2 = string;
export type ConversationId5 = string;
export type GenerationId5 = number;
export type SchemaVersion5 = 1;
export type Sequence5 = number;
export type StoppedGenerationId = number;
export type Type5 = "interrupt";
export type ConversationId6 = string;
export type GenerationId6 = number;
export type LastPlayedSample = number;
export type SchemaVersion6 = 1;
export type Sequence6 = number;
export type StoppedGenerationId1 = number;
export type Type6 = "playback_stopped";
export type Code =
  | "invalid_manifest"
  | "invalid_config"
  | "incompatible_protocol"
  | "plugin_missing"
  | "duplicate_plugin"
  | "capability_missing"
  | "license_ineligible"
  | "artifact_missing"
  | "unsupported_language"
  | "unsupported_hardware"
  | "kind_mismatch"
  | "format_mismatch"
  | "invalid_transition"
  | "plugin_load_failed";
export type ConversationId7 = string;
export type GenerationId7 = number;
export type Message = string;
export type PluginId = string | null;
export type SchemaVersion7 = 1;
export type Sequence7 = number;
export type Type7 = "error";
export type ApiVersion = 1;
/**
 * @minItems 1
 */
export type Artifacts = [Artifact, ...Artifact[]];
export type Attribution = string;
export type Eligibility = "reviewed_permissive" | "restricted" | "unresolved";
export type Id = string;
export type LicenseId = string;
export type LicenseUrl = string;
export type Purpose = "code" | "weights" | "voice" | "asset";
export type Revision = string;
export type Sha256 = string;
export type SourceUrl = string;
export type AssetSchema = {
  [k: string]: JsonValue;
} | null;
export type Cancellation = "cooperative" | "discard_late_output";
/**
 * @minItems 1
 */
export type InputFormats = [
  (
    | "pcm_s16le"
    | "transcript.v1"
    | "text.delta.v1"
    | "tool.call.v1"
    | "turn.decision.v1"
    | "arkit52.v1"
    | "video.rgb24"
    | "canvas.operation.v1"
    | "image.png"
  ),
  ...(
    | "pcm_s16le"
    | "transcript.v1"
    | "text.delta.v1"
    | "tool.call.v1"
    | "turn.decision.v1"
    | "arkit52.v1"
    | "video.rgb24"
    | "canvas.operation.v1"
    | "image.png"
  )[]
];
/**
 * @minItems 1
 */
export type OutputFormats = [
  (
    | "pcm_s16le"
    | "transcript.v1"
    | "text.delta.v1"
    | "tool.call.v1"
    | "turn.decision.v1"
    | "arkit52.v1"
    | "video.rgb24"
    | "canvas.operation.v1"
    | "image.png"
  ),
  ...(
    | "pcm_s16le"
    | "transcript.v1"
    | "text.delta.v1"
    | "tool.call.v1"
    | "turn.decision.v1"
    | "arkit52.v1"
    | "video.rgb24"
    | "canvas.operation.v1"
    | "image.png"
  )[]
];
/**
 * @minItems 1
 */
export type RequiredArtifacts = [string, ...string[]];
export type DisplayName = string;
export type EntryPoint = string;
/**
 * @minItems 1
 */
export type Execution = [
  "in_process" | "local_worker" | "remote_worker" | "endpoint" | "browser",
  ...("in_process" | "local_worker" | "remote_worker" | "endpoint" | "browser")[]
];
export type Accelerator = "none" | "cpu" | "metal" | "cuda";
export type MeasurementRunIds = string[];
export type MinRamMb = number;
export type MinVramMb = number;
export type Id1 = string;
export type Kind = "stt" | "llm" | "tts" | "turn" | "avatar" | "image";
/**
 * @minItems 1
 */
export type Languages = [string, ...string[]];
export type Renderer1 = string | null;
export type SchemaVersion8 = 1;
export type Streaming = "native" | "chunk_adapter" | "none";
export type Capability1 = string;
export type Execution1 = "in_process" | "local_worker" | "remote_worker" | "endpoint" | "browser";
export type PluginId1 = string;
export type Id2 = string;
export type Language = string;
export type SchemaVersion9 = 1;

export interface ContractBundle {
  event: Event;
  manifest: Manifest;
  profile: Profile;
}
export interface SessionEvent {
  conversation_id: ConversationId;
  generation_id: GenerationId;
  schema_version: SchemaVersion;
  sequence: Sequence;
  state: State;
  type: Type;
}
export interface TextEvent {
  conversation_id: ConversationId1;
  generation_id: GenerationId1;
  schema_version: SchemaVersion1;
  sequence: Sequence1;
  text: Text;
  type: Type1;
}
export interface AudioEvent {
  channels: Channels;
  conversation_id: ConversationId2;
  data_b64: DataB64;
  format: Format;
  generation_id: GenerationId2;
  presentation_sample: PresentationSample;
  sample_rate: SampleRate;
  schema_version: SchemaVersion2;
  sequence: Sequence2;
  type: Type2;
  utterance_id: UtteranceId;
}
export interface AvatarEvent {
  coefficients: Coefficients;
  conversation_id: ConversationId3;
  format: Format1;
  generation_id: GenerationId3;
  presentation_sample: PresentationSample1;
  renderer: Renderer;
  schema_version: SchemaVersion3;
  sequence: Sequence3;
  type: Type3;
  utterance_id: UtteranceId1;
}
export interface CanvasEvent {
  conversation_id: ConversationId4;
  generation_id: GenerationId4;
  operation_id: OperationId;
  payload: Payload;
  payload_version: PayloadVersion;
  presentation_sample: PresentationSample2;
  schema_version: SchemaVersion4;
  sequence: Sequence4;
  tool_name: ToolName;
  type: Type4;
  utterance_id: UtteranceId2;
}
export interface Payload {
  [k: string]: JsonValue;
}
export interface InterruptEvent {
  conversation_id: ConversationId5;
  generation_id: GenerationId5;
  schema_version: SchemaVersion5;
  sequence: Sequence5;
  stopped_generation_id: StoppedGenerationId;
  type: Type5;
}
export interface PlaybackStoppedEvent {
  conversation_id: ConversationId6;
  generation_id: GenerationId6;
  last_played_sample: LastPlayedSample;
  schema_version: SchemaVersion6;
  sequence: Sequence6;
  stopped_generation_id: StoppedGenerationId1;
  type: Type6;
}
export interface ErrorEvent {
  code: Code;
  conversation_id: ConversationId7;
  generation_id: GenerationId7;
  message: Message;
  plugin_id?: PluginId;
  schema_version: SchemaVersion7;
  sequence: Sequence7;
  type: Type7;
}
export interface Manifest {
  api_version: ApiVersion;
  artifacts: Artifacts;
  asset_schema?: AssetSchema;
  cancellation: Cancellation;
  capabilities: Capabilities;
  config_schema: ConfigSchema;
  display_name: DisplayName;
  entry_point: EntryPoint;
  execution: Execution;
  hardware: Hardware;
  id: Id1;
  kind: Kind;
  languages: Languages;
  renderer?: Renderer1;
  schema_version: SchemaVersion8;
  streaming: Streaming;
}
export interface Artifact {
  attribution: Attribution;
  eligibility: Eligibility;
  id: Id;
  license_id: LicenseId;
  license_url: LicenseUrl;
  purpose: Purpose;
  revision: Revision;
  sha256: Sha256;
  source_url: SourceUrl;
}
export interface Capabilities {
  [k: string]: Capability;
}
/**
 * This interface was referenced by `Capabilities`'s JSON-Schema definition
 * via the `patternProperty` "^[a-zA-Z0-9_.-]+$".
 */
export interface Capability {
  input_formats: InputFormats;
  output_formats: OutputFormats;
  required_artifacts: RequiredArtifacts;
}
export interface ConfigSchema {
  [k: string]: JsonValue;
}
export interface Hardware {
  [k: string]: HardwareRequirement;
}
export interface HardwareRequirement {
  accelerator?: Accelerator;
  measurement_run_ids?: MeasurementRunIds;
  min_ram_mb?: MinRamMb;
  min_vram_mb?: MinVramMb;
}
export interface Profile {
  avatar?: EngineSelection | null;
  id: Id2;
  language: Language;
  llm: EngineSelection;
  schema_version: SchemaVersion9;
  stt: EngineSelection;
  tts: EngineSelection;
  turn: EngineSelection;
}
export interface EngineSelection {
  capability: Capability1;
  config?: Config;
  execution: Execution1;
  plugin_id: PluginId1;
}
export interface Config {
  [k: string]: JsonValue;
}
