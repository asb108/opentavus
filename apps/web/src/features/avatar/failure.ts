export class AvatarFailure extends Error {
  constructor(
    readonly code: "unsupported_graphics" | "asset_unavailable" | "context_lost",
    message: string,
  ) {
    super(message);
  }
}
