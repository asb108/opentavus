import type { Event } from "./generated.js";

export type Generation = Pick<Event, "conversation_id" | "generation_id">;

export function acceptsOutput(active: Generation, incoming: Generation): boolean {
  return (
    active.conversation_id === incoming.conversation_id &&
    active.generation_id === incoming.generation_id
  );
}
