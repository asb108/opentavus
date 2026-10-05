import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  Github,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { providerRequest, request, type Catalog, type ProviderView } from "./api";
import { Avatar } from "./features/avatar/Avatar";
import type { AvatarRenderer } from "./features/avatar/renderer";
import { avatarInfo } from "./features/avatar/catalog";
import type { BoardHandle } from "./features/canvas/Board";
import { Settings } from "./features/settings/Settings";
import { useConversation } from "./features/call/useConversation";
import { publicPreferences, savedSettings } from "./features/settings/preferences";

const Board = lazy(() =>
  import("./features/canvas/Board").then((module) => ({ default: module.Board })),
);

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [providers, setProviders] = useState<ProviderView[]>([]);
  const [settings, setSettings] = useState(savedSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [teach, setTeach] = useState(false);
  const [copied, setCopied] = useState(false);
  const [callSettings, setCallSettings] = useState(settings);
  const board = useRef<BoardHandle | null>(null);
  const renderer = useRef<AvatarRenderer | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const conversation = useConversation(board, renderer);
  const setError = conversation.setError;
  const active = conversation.state !== "idle";
  const displayedSettings = active ? callSettings : settings;
  const callAvatar = callSettings.avatar;
  const selectionReady =
    settings.provider_id === "local"
      ? catalog?.models.some((model) => model.name === settings.model && model.ready) === true
      : providers.some(
          (provider) =>
            provider.configuration.id === settings.provider_id &&
            provider.configuration.model === settings.model &&
            provider.ready,
        );
  const ready = active || selectionReady;
  const displayedProvider = providers.find(
    (provider) => provider.configuration.id === displayedSettings.provider_id,
  );
  const destination = displayedProvider?.configuration.endpoint;
  const remote = destination
    ? !["localhost", "127.0.0.1", "[::1]"].includes(new URL(destination).hostname)
    : false;
  const teachingAvailable = active
    ? conversation.teachingAvailable
    : displayedSettings.provider_id === "local" ||
      displayedProvider?.configuration.teaching === true;
  const stateLabels = {
    idle: "Ready for a good question",
    preparing: "Preparing your companion…",
    listening: "I'm listening",
    thinking: teach && teachingAvailable ? "Putting the idea together…" : "Thinking it through…",
    speaking: "You can interrupt me",
  };

  useEffect(() => {
    void request<Catalog>("/api/catalog")
      .then(setCatalog)
      .catch(() =>
        setError("The local server is unavailable. Start it with make run, then refresh."),
      );
    void providerRequest()
      .then((result) => setProviders(result.providers))
      .catch(() => setError("Provider settings could not be loaded. Refresh the local page."));
  }, [setError]);
  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages]);
  useEffect(() => {
    try {
      localStorage.setItem("opentavus.settings.v2", JSON.stringify(publicPreferences(settings)));
      localStorage.removeItem("opentavus.settings.v1");
    } catch {
      /* Live settings remain usable. */
    }
  }, [settings]);

  const begin = async () => {
    setCallSettings(settings);
    await conversation.start(settings, true);
    conversation.setTeaching(teach && teachingAvailable);
  };
  const submit = async (text: string = question, useBoard = teach && teachingAvailable) => {
    if (!text.trim() || !ready) return;
    if (!active) setCallSettings(settings);
    setQuestion("");
    await conversation.ask(text, settings, useBoard);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/" className="wordmark" aria-label="OpenTavus home">
          <img src="/logo.svg" alt="" />
          OpenTavus<span>alpha</span>
        </a>
        <nav aria-label="Main navigation">
          <span className="local-badge">
            <ShieldCheck size={15} />
            {remote ? "Local speech · External model" : "Runs on your machine"}
          </span>
          <a href="https://github.com/asb108/opentavus" target="_blank" rel="noreferrer">
            <Github size={17} /> Contribute
          </a>
          <button
            onClick={() => setSettingsOpen(true)}
            className="icon-button"
            aria-label="Companion settings"
          >
            <Settings2 size={19} />
          </button>
        </nav>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>Make room for a good question.</h1>
            <p>A conversation, a canvas, and a little curiosity.</p>
          </div>
          <span className="free-label">
            <span className="small-dot" /> Free & open source
          </span>
        </div>
        {catalog && !selectionReady && !active && (
          <div className="setup-notice" role="status">
            <div>
              <strong>Your selected model needs preparation.</strong>
              <p>
                {settings.provider_id === "local"
                  ? "With Ollama running, download the reviewed speech and language models once. Then refresh this page."
                  : "Open companion settings to check the provider, its key and local speech models."}
              </p>
            </div>
            <button
              onClick={() => {
                void navigator.clipboard.writeText("make models");
                setCopied(true);
              }}
            >
              {copied ? <Check size={16} /> : <ChevronRight size={16} />}{" "}
              {copied ? "Copied" : "Copy: make models"}
            </button>
          </div>
        )}
        {remote && (
          <p className="provider-disclosure">
            Your conversation text and board requests go to {destination}. This provider may charge
            your account. Speech and portraits stay on this machine.
          </p>
        )}
        {conversation.error && (
          <div className="error-notice" role="alert">
            <span>{conversation.error}</span>
            <button aria-label="Dismiss error" onClick={() => conversation.setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        <div className="workspace">
          <section className="conversation" aria-label="AI conversation">
            <div className="stage">
              <div className="stage-top">
                <span className={`state-pill ${active ? "connected" : ""}`}>
                  <span />
                  {active ? "AI conversation" : "Meet your companion"}
                </span>
                <span className="ai-label">{avatarInfo[displayedSettings.avatar].label}</span>
              </div>
              <div className="character-frame">
                <div className="orbit-circle" />
                <Avatar variant={active ? callAvatar : settings.avatar} rendererRef={renderer} />
              </div>
              <div className="character-caption">
                <h2>{avatarInfo[displayedSettings.avatar].name}</h2>
                <p className="status-line" role="status">
                  {stateLabels[conversation.state]}
                </p>
              </div>
              {!active ? (
                <button className="start-call" onClick={() => void begin()} disabled={!ready}>
                  <Mic size={18} /> Start conversation
                </button>
              ) : (
                <div className="call-controls">
                  <button
                    className={conversation.micEnabled ? "" : "muted"}
                    onClick={conversation.toggleMic}
                    aria-label={conversation.micEnabled ? "Mute microphone" : "Unmute microphone"}
                  >
                    {conversation.micEnabled ? <Mic size={19} /> : <MicOff size={19} />}
                  </button>
                  <button onClick={conversation.stop} aria-label="Stop reply">
                    <Square size={17} fill="currentColor" />
                  </button>
                  <button
                    className="end-call"
                    onClick={() => void conversation.end()}
                    aria-label="End conversation"
                  >
                    <PhoneOff size={19} />
                  </button>
                </div>
              )}
              <div className="model-caption">
                <button onClick={() => setSettingsOpen(true)}>
                  {displayedSettings.model.replace("qwen2.5:", "Qwen 2.5 ")}
                  <Settings2 size={12} />
                </button>
                <span>
                  {catalog?.voices.find((voice) => voice.id === displayedSettings.voice)?.name ||
                    "Heart"}{" "}
                  voice
                </span>
              </div>
            </div>
            <div
              className="transcript"
              ref={transcript}
              aria-label="Conversation transcript"
              aria-live="polite"
            >
              {conversation.messages.length === 0 ? (
                <div className="welcome">
                  <span className="welcome-icon">
                    <Sparkles size={19} />
                  </span>
                  <h3>Big ideas start with small questions.</h3>
                  <p>Talk it through, sketch a thought, or ask me to teach it on the board.</p>
                  <div className="suggestions">
                    {[
                      "Why is the sky blue?",
                      "Teach me Newton's second law",
                      "Quiz me on photosynthesis",
                    ].map((text) => (
                      <button
                        key={text}
                        disabled={!ready}
                        onClick={() => {
                          setQuestion(text);
                          if (text !== "Why is the sky blue?") setTeach(true);
                          composer.current?.focus();
                        }}
                      >
                        {text}
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                conversation.messages.map((message) => (
                  <div className={`message ${message.role}`} key={message.id}>
                    <strong>{message.role === "user" ? "You" : message.name || "AI"}</strong>
                    <p>
                      {message.text}
                      {message.partial && <span className="partial"> · Interrupted</span>}
                    </p>
                  </div>
                ))
              )}
            </div>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <textarea
                ref={composer}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Or type a question…"
                aria-label="Your question"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
              />
              <div className="composer-bottom">
                <button
                  type="button"
                  className={`teach-toggle ${teach && teachingAvailable ? "on" : ""}`}
                  aria-pressed={teach && teachingAvailable}
                  disabled={!teachingAvailable}
                  title={
                    teachingAvailable
                      ? "Request a board explanation"
                      : "This model is configured for conversation only"
                  }
                  onClick={() => {
                    setTeach(!teach);
                    conversation.setTeaching(!teach);
                  }}
                >
                  <Sparkles size={14} /> Teach on board
                </button>
                <button
                  className="send-question"
                  aria-label="Send question"
                  type="submit"
                  disabled={!question.trim() || !ready || conversation.state === "preparing"}
                >
                  <ArrowUp size={20} />
                </button>
              </div>
            </form>
          </section>
          <Suspense
            fallback={
              <section className="board board-loading">Opening your shared canvas…</section>
            }
          >
            <Board
              ref={board}
              busy={conversation.state === "preparing"}
              onTeach={() => {
                setTeach(true);
                conversation.setTeaching(true);
                const subject =
                  question.trim() ||
                  [...conversation.messages].reverse().find((message) => message.role === "user")
                    ?.text;
                if (subject) void submit(subject, true);
                else {
                  setQuestion(
                    "Teach me a concept with a short note, a formula or diagram, and a practice question.",
                  );
                  composer.current?.focus();
                }
              }}
            />
          </Suspense>
        </div>
        <footer className="page-footer">
          <span>
            <ShieldCheck size={14} />
            No account. No recordings. Your board stays in this browser.
          </span>
          <a
            href="https://github.com/asb108/opentavus/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noreferrer"
          >
            Built in the open. Help shape it.
          </a>
        </footer>
      </main>
      <Settings
        open={settingsOpen}
        close={() => setSettingsOpen(false)}
        value={settings}
        onChange={setSettings}
        catalog={catalog}
        active={active}
        providers={providers}
        onProvidersChange={setProviders}
      />
    </div>
  );
}
