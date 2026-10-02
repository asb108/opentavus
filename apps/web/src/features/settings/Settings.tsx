import { useEffect, useRef } from "react";
import { Check, Cpu, Heart, Smile, X } from "lucide-react";
import type { Catalog, Settings as CallSettings } from "../../api";

export function Settings({
  open,
  close,
  value,
  onChange,
  catalog,
  active,
}: {
  open: boolean;
  close: () => void;
  value: CallSettings;
  onChange: (settings: CallSettings) => void;
  catalog: Catalog | null;
  active: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog ref={dialog} className="settings-dialog" onCancel={close}>
      <header>
        <div>
          <h2>Make it your companion</h2>
          <p>
            {active
              ? "Changes apply to your next conversation."
              : "Choose independently. Keep everything local."}
          </p>
        </div>
        <button onClick={close} aria-label="Close settings">
          <X />
        </button>
      </header>
      <fieldset>
        <legend>
          <Cpu size={18} /> Brain
        </legend>
        <p>Installed local models, with reviewed Apache-2.0 weights.</p>
        {catalog?.models.map((model) => (
          <label
            className={`choice ${value.model === model.name ? "selected" : ""}`}
            key={model.name}
          >
            <input
              type="radio"
              name="model"
              value={model.name}
              checked={value.model === model.name}
              disabled={!model.ready}
              onChange={() => onChange({ ...value, model: model.name })}
            />
            <span>
              <strong>{model.name.replace("qwen2.5:", "Qwen 2.5 ")}</strong>
              <small>
                {model.ready ? `${Math.round(model.size / 1000000)} MB · Installed` : model.reason}
              </small>
            </span>
            {value.model === model.name && <Check size={18} />}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>
          <Heart size={18} /> Voice
        </legend>
        <div className="voice-options">
          {catalog?.voices.map((voice) => (
            <label
              key={voice.id}
              className={`choice ${value.voice === voice.id ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="voice"
                checked={value.voice === voice.id}
                onChange={() => onChange({ ...value, voice: voice.id })}
              />
              <span>
                <strong>{voice.name}</strong>
                <small>{voice.description}</small>
              </span>
            </label>
          ))}
        </div>
        <p>Kokoro preset voices. English is the tested alpha profile.</p>
      </fieldset>
      <fieldset>
        <legend>
          <Smile size={18} /> Character
        </legend>
        <div className="voice-options">
          {catalog?.avatars.map((avatar) => (
            <label
              key={avatar.id}
              className={`choice ${value.avatar === avatar.id ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="avatar"
                checked={value.avatar === avatar.id}
                onChange={() => onChange({ ...value, avatar: avatar.id })}
              />
              <span>
                <strong>{avatar.name}</strong>
                <small>
                  {avatar.id === "orbit" ? "Blue cartoon preview" : "Green cartoon preview"}
                </small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p>These are cartoon previews. Realistic human video is a separate avatar capability.</p>
      <div className="settings-footnote">
        <strong>Speech recognition</strong>
        <span>{catalog?.stt || "Whisper tiny / English"}</span>
        <p>
          No recordings are saved. The current transcript lives in this page; drawings are saved in
          this browser. Portrait plugins are separate installs.
        </p>
      </div>
      <button className="primary save-settings" onClick={close}>
        Done
      </button>
    </dialog>
  );
}
