import { useState } from "react";
import { Check } from "lucide-react";
import {
  providerRequest,
  type ProviderConfiguration,
  type ProviderView,
  type Settings,
} from "../../api";

const initial: ProviderConfiguration = {
  id: "compatible-local",
  name: "Local compatible endpoint",
  kind: "compatible",
  endpoint: "http://127.0.0.1:11434/v1",
  model: "qwen2.5:1.5b",
  teaching: false,
  requires_key: false,
  max_output_tokens: 700,
  timeout_seconds: 60,
  terms_url: null,
  model_identity: "provider_declared",
};

export function Providers({
  providers,
  value,
  onChange,
  active,
  onRefresh,
}: {
  providers: ProviderView[];
  value: Settings;
  onChange: (value: Settings) => void;
  active: boolean;
  onRefresh: (providers: ProviderView[]) => void;
}) {
  const [draft, setDraft] = useState<ProviderConfiguration | null>(null);
  const [key, setKey] = useState("");
  const [removeKey, setRemoveKey] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = () => {
    setDraft(null);
    setKey("");
    setRemoveKey(false);
    setError("");
  };
  const change = (fields: Partial<ProviderConfiguration>) =>
    setDraft((previous) => (previous ? { ...previous, ...fields } : null));
  const save = async () => {
    if (!draft || active) return;
    setBusy(true);
    setError("");
    try {
      const result = await providerRequest({
        method: "POST",
        body: JSON.stringify({ configuration: draft, api_key: key || null, remove_key: removeKey }),
      });
      onRefresh(result.providers);
      if (value.provider_id === draft.id) onChange({ ...value, model: draft.model });
      reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this provider.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await providerRequest({ method: "DELETE" }, id);
      onRefresh(result.providers);
      if (value.provider_id === id)
        onChange({ ...value, provider_id: "local", model: "qwen2.5:1.5b" });
      reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove this provider.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="providers">
      <p>
        Use your own compatible endpoint or OpenRouter model. Connection and model support are
        checked when the call starts. These profiles are experimental.
      </p>
      {providers.map(
        ({ configuration: config, credential_configured: credential, ready, reason }) => (
          <div className="provider-card" key={config.id}>
            <label
              className={`choice ${value.provider_id === config.id && value.model === config.model ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="model"
                checked={value.provider_id === config.id && value.model === config.model}
                disabled={!ready || busy}
                onChange={() => onChange({ ...value, provider_id: config.id, model: config.model })}
              />
              <span>
                <strong>{config.name}</strong>
                <small>{config.model} · Experimental</small>
                <small>{config.endpoint}</small>
                <small>{reason}</small>
                <small>
                  {config.teaching
                    ? "Board tools requested; support is checked during the call"
                    : "Conversation only"}{" "}
                  · {credential ? "Key configured" : "No key configured"}
                </small>
              </span>
              {value.provider_id === config.id && <Check size={18} />}
            </label>
            <div className="provider-actions">
              <button
                disabled={active || busy}
                onClick={() => {
                  setDraft(config);
                  setKey("");
                  setRemoveKey(false);
                  setError("");
                }}
              >
                Edit provider
              </button>
              <button disabled={active || busy} onClick={() => void remove(config.id)}>
                Remove provider and key
              </button>
            </div>
          </div>
        ),
      )}
      {!draft && (
        <button
          disabled={active || busy}
          onClick={() => {
            let id = initial.id;
            let index = 1;
            while (providers.some((provider) => provider.configuration.id === id))
              id = `${initial.id}-${++index}`;
            setDraft({ ...initial, id });
          }}
        >
          Add model provider
        </button>
      )}
      {draft && (
        <form
          className="provider-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={active || busy}>
            <legend>Model provider</legend>
            <label>
              Provider type
              <select
                value={draft.kind}
                onChange={(event) => {
                  const openrouter = event.target.value === "openrouter";
                  change({
                    kind: openrouter ? "openrouter" : "compatible",
                    endpoint: openrouter ? "https://openrouter.ai/api/v1" : initial.endpoint,
                    requires_key: openrouter,
                    name: openrouter ? "OpenRouter model" : initial.name,
                    model: openrouter ? "" : initial.model,
                  });
                  setKey("");
                  setRemoveKey(false);
                }}
              >
                <option value="compatible">Compatible endpoint</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </label>
            <label>
              Provider ID
              <input
                value={draft.id}
                required
                maxLength={96}
                pattern="[a-zA-Z0-9_.-]+"
                onChange={(event) => change({ id: event.target.value })}
              />
            </label>
            <label>
              Display name
              <input
                value={draft.name}
                required
                maxLength={80}
                onChange={(event) => change({ name: event.target.value })}
              />
            </label>
            <label>
              API base URL
              <input
                value={draft.endpoint}
                required
                maxLength={300}
                readOnly={draft.kind === "openrouter"}
                onChange={(event) => change({ endpoint: event.target.value })}
              />
            </label>
            <label>
              Model ID
              <input
                value={draft.model}
                required
                maxLength={160}
                placeholder="Exact model name from your provider"
                onChange={(event) => change({ model: event.target.value })}
              />
            </label>
            <label>
              API key
              <input
                type="password"
                autoComplete="off"
                value={key}
                disabled={removeKey}
                maxLength={512}
                placeholder="Leave blank to keep an existing key"
                onChange={(event) => setKey(event.target.value)}
              />
            </label>
            <label className="provider-toggle">
              <input
                type="checkbox"
                checked={removeKey}
                onChange={(event) => {
                  setRemoveKey(event.target.checked);
                  setKey("");
                }}
              />
              Remove the stored key
            </label>
            <label className="provider-toggle">
              <input
                type="checkbox"
                checked={draft.requires_key ?? false}
                disabled={draft.kind === "openrouter"}
                onChange={(event) => change({ requires_key: event.target.checked })}
              />
              This endpoint requires an API key
            </label>
            <label className="provider-toggle">
              <input
                type="checkbox"
                checked={draft.teaching ?? false}
                onChange={(event) => change({ teaching: event.target.checked })}
              />
              Enable schema-based board tools
            </label>
            <p>
              Remote endpoints receive conversation text and board requests and may charge your
              account. Recognition, speech and portraits remain local. Use HTTPS for remote
              endpoints. Model identity and terms come from the provider; these are separate from
              the reviewed local model licenses.
            </p>
            <p>
              Keys are saved only by the local server in a private configuration file. They are
              never returned by settings or saved in this browser.
            </p>
            <div className="provider-actions">
              <button type="submit" className="primary">
                {busy ? "Saving…" : "Save provider"}
              </button>
              <button type="button" onClick={reset}>
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {active && (
        <p>
          End your conversation before editing providers or keys. You can select your next model,
          voice and character now.
        </p>
      )}
      {error && (
        <p className="provider-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
