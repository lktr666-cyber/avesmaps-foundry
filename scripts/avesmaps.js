const MODULE_ID = "avesmaps-foundry";
const DEFAULT_URL = "https://avesmaps.de/";

let activeApp = null;

function mayOpen() {
  return game.user?.isGM || game.settings.get(MODULE_ID, "playersCanOpen");
}

function normalizeBaseUrl() {
  const configured = String(game.settings.get(MODULE_ID, "defaultUrl") || DEFAULT_URL).trim();
  try {
    const url = new URL(configured);
    return url.toString();
  } catch (_err) {
    return DEFAULT_URL;
  }
}

function buildDeepLink(type, name) {
  const allowed = new Set(["siedlung", "staat", "region", "strasse", "fluss", "place", "s"]);
  if (!allowed.has(type)) throw new Error(`Unbekannter Avesmaps-Linktyp: ${type}`);

  const url = new URL(normalizeBaseUrl());
  const value = String(name ?? "").trim();
  if (!value) return url.toString();

  url.search = "";
  url.searchParams.set(type, value.replaceAll(" ", "_"));
  return url.toString();
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class AvesmapsApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "avesmaps-foundry-window",
    classes: ["avesmaps-foundry-window"],
    position: {
      width: 1200,
      height: 820
    },
    window: {
      title: "Avesmaps – Aventurien",
      icon: "fa-solid fa-map-location-dot",
      resizable: true
    },
    actions: {
      home: this.#goHome,
      reload: this.#reload,
      external: this.#openExternal
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/avesmaps.hbs`
    }
  };

  constructor({ url = null, ...options } = {}) {
    super(options);
    this.avesmapsUrl = url || normalizeBaseUrl();
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      avesmapsUrl: this.avesmapsUrl
    };
  }

  async setUrl(url) {
    this.avesmapsUrl = String(url || normalizeBaseUrl());
    await this.render({ force: true });
  }

  get iframe() {
    return this.element?.querySelector?.("iframe.avesmaps-frame") ?? null;
  }

  static #goHome(_event, _target) {
    this.avesmapsUrl = normalizeBaseUrl();
    const frame = this.iframe;
    if (frame) frame.src = this.avesmapsUrl;
  }

  static #reload(_event, _target) {
    const frame = this.iframe;
    if (!frame) return;
    const current = frame.src || this.avesmapsUrl;
    frame.src = "about:blank";
    requestAnimationFrame(() => {
      frame.src = current;
    });
  }

  static #openExternal(_event, _target) {
    const frame = this.iframe;
    const url = frame?.src || this.avesmapsUrl || normalizeBaseUrl();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  _onClose(options) {
    super._onClose(options);
    if (activeApp === this) activeApp = null;
  }
}

async function openAvesmaps(url = null) {
  if (!mayOpen()) {
    ui.notifications.warn("Avesmaps ist in dieser Welt nur für die Spielleitung freigegeben.");
    return null;
  }

  const targetUrl = url || normalizeBaseUrl();

  if (activeApp?.rendered) {
    await activeApp.setUrl(targetUrl);
    activeApp.bringToFront?.();
    return activeApp;
  }

  activeApp = new AvesmapsApplication({ url: targetUrl });
  await activeApp.render({ force: true });
  return activeApp;
}

function openDeepLink(type, name) {
  return openAvesmaps(buildDeepLink(type, name));
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "defaultUrl", {
    name: "Avesmaps-URL",
    hint: "Normalerweise https://avesmaps.de/. Kann auch auf eine eigene Avesmaps-Instanz zeigen.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_URL
  });

  game.settings.register(MODULE_ID, "playersCanOpen", {
    name: "Avesmaps für Spieler erlauben",
    hint: "Wenn deaktiviert, können nur Spielleiter das Avesmaps-Fenster öffnen.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.keybindings.register(MODULE_ID, "openAvesmaps", {
    name: "Avesmaps öffnen",
    hint: "Öffnet den Aventurien-Routenplaner in einem Foundry-Fenster.",
    editable: [
      {
        key: "KeyA",
        modifiers: ["SHIFT"]
      }
    ],
    onDown: () => {
      openAvesmaps();
      return true;
    },
    restricted: false
  });
});

Hooks.on("getSceneControlButtons", controls => {
  if (!mayOpen()) return;

  // Token controls exist in normal game worlds for both GMs and players.
  const target = controls.tokens ?? Object.values(controls).find(c => c?.tools);
  if (!target?.tools) return;

  target.tools.avesmaps = {
    name: "avesmaps",
    title: "Avesmaps öffnen",
    icon: "fa-solid fa-map-location-dot",
    order: Math.max(0, ...Object.values(target.tools).map(t => Number(t.order) || 0)) + 1,
    button: true,
    visible: true,
    onChange: () => openAvesmaps()
  };
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      open: openAvesmaps,
      url: buildDeepLink,
      settlement: name => openDeepLink("siedlung", name),
      state: name => openDeepLink("staat", name),
      region: name => openDeepLink("region", name),
      road: name => openDeepLink("strasse", name),
      river: name => openDeepLink("fluss", name),
      place: name => openDeepLink("place", name),
      shared: code => openDeepLink("s", code)
    };
  }

  console.info(`${MODULE_ID} | ready`);
});
