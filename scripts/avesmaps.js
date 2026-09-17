const MODULE_ID = "avesmaps-foundry";
const DEFAULT_URL = "https://avesmaps.de/";

let activeApp = null;

function mayOpen() {
  return game.user?.isGM || game.settings.get(MODULE_ID, "playersCanOpen");
}

function normalizeBaseUrl() {
  const configured = String(game.settings.get(MODULE_ID, "defaultUrl") || DEFAULT_URL).trim();
  try {
    return new URL(configured).toString();
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

function currentFrame(app) {
  if (!app) return null;
  const el = app.element;
  if (!el) return null;
  if (el instanceof HTMLElement) return el.querySelector("iframe.avesmaps-frame");
  if (el?.find) return el.find("iframe.avesmaps-frame")[0] ?? null;
  return null;
}

function goHome(app) {
  app.avesmapsUrl = normalizeBaseUrl();
  const frame = currentFrame(app);
  if (frame) frame.src = app.avesmapsUrl;
}

function reloadFrame(app) {
  const frame = currentFrame(app);
  if (!frame) return;
  const current = frame.src || app.avesmapsUrl;
  frame.src = "about:blank";
  requestAnimationFrame(() => {
    frame.src = current;
  });
}

function openExternal(app) {
  const frame = currentFrame(app);
  const url = frame?.src || app?.avesmapsUrl || normalizeBaseUrl();
  window.open(url, "_blank", "noopener,noreferrer");
}

const hasApplicationV2 = Boolean(foundry?.applications?.api?.ApplicationV2);
let AvesmapsApplication;

if (hasApplicationV2) {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  AvesmapsApplication = class extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "avesmaps-foundry-window",
      classes: ["avesmaps-foundry-window"],
      position: { width: 1200, height: 820 },
      window: {
        title: "Avesmaps – Aventurien",
        icon: "fa-solid fa-map-location-dot",
        resizable: true
      },
      actions: {
        home: function () { goHome(this); },
        reload: function () { reloadFrame(this); },
        external: function () { openExternal(this); }
      }
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/avesmaps.hbs` }
    };

    constructor({ url = null, ...options } = {}) {
      super(options);
      this.avesmapsUrl = url || normalizeBaseUrl();
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, avesmapsUrl: this.avesmapsUrl };
    }

    async setUrl(url) {
      this.avesmapsUrl = String(url || normalizeBaseUrl());
      await this.render({ force: true });
    }

    _onClose(options) {
      super._onClose(options);
      if (activeApp === this) activeApp = null;
    }
  };
} else {
  // Foundry VTT 11/12 legacy Application API.
  AvesmapsApplication = class extends Application {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id: "avesmaps-foundry-window",
        classes: ["avesmaps-foundry-window"],
        title: "Avesmaps – Aventurien",
        template: `modules/${MODULE_ID}/templates/avesmaps.hbs`,
        width: 1200,
        height: 820,
        resizable: true
      });
    }

    constructor({ url = null, ...options } = {}) {
      super(options);
      this.avesmapsUrl = url || normalizeBaseUrl();
    }

    getData(options = {}) {
      return { ...super.getData(options), avesmapsUrl: this.avesmapsUrl };
    }

    activateListeners(html) {
      super.activateListeners(html);
      html.find('[data-action="home"]').on("click", () => goHome(this));
      html.find('[data-action="reload"]').on("click", () => reloadFrame(this));
      html.find('[data-action="external"]').on("click", () => openExternal(this));
    }

    async setUrl(url) {
      this.avesmapsUrl = String(url || normalizeBaseUrl());
      this.render(true);
    }

    async close(options = {}) {
      if (activeApp === this) activeApp = null;
      return super.close(options);
    }
  };
}

async function renderApplication(app) {
  if (hasApplicationV2) await app.render({ force: true });
  else app.render(true);
}

async function openAvesmaps(url = null) {
  if (!mayOpen()) {
    ui.notifications.warn("Avesmaps ist in dieser Welt nur für die Spielleitung freigegeben.");
    return null;
  }

  const targetUrl = url || normalizeBaseUrl();

  if (activeApp?.rendered) {
    await activeApp.setUrl(targetUrl);
    if (hasApplicationV2) activeApp.bringToFront?.();
    else activeApp.bringToTop?.();
    return activeApp;
  }

  activeApp = new AvesmapsApplication({ url: targetUrl });
  await renderApplication(activeApp);
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
    editable: [{ key: "KeyA", modifiers: ["SHIFT"] }],
    onDown: () => {
      openAvesmaps();
      return true;
    },
    restricted: false
  });
});

Hooks.on("getSceneControlButtons", controls => {
  if (!mayOpen()) return;

  // Foundry 11/12: controls is an array and tools is an array.
  if (Array.isArray(controls)) {
    const target = controls.find(c => c?.name === "token" || c?.name === "tokens")
      ?? controls.find(c => Array.isArray(c?.tools));
    if (!target?.tools) return;

    target.tools.push({
      name: "avesmaps",
      title: "Avesmaps öffnen",
      icon: "fas fa-map-marked-alt",
      button: true,
      visible: true,
      onClick: () => openAvesmaps()
    });
    return;
  }

  // Foundry 13/14: controls and tools are records.
  const target = controls.tokens ?? controls.token ?? Object.values(controls).find(c => c?.tools);
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

  console.info(`${MODULE_ID} | ready on Foundry ${game.version}`);
});
