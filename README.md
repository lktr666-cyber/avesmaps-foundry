# Avesmaps for Foundry

Kleines, systemunabhängiges Foundry-VTT-Modul, das [Avesmaps](https://avesmaps.de/) in einem Foundry-Fenster öffnet und Deep-Link-Helfer für aventurische Orte bereitstellt.

> Dieses Projekt enthält **keine Kartenkacheln oder Daten von Avesmaps** und ist kein offizielles Avesmaps- oder DSA-Produkt. Es öffnet lediglich die öffentliche Avesmaps-Webseite. Ob die Webseite in einem eingebetteten Frame angezeigt werden darf, hängt von den jeweils aktuellen Sicherheits-Headern der Webseite bzw. des Browsers ab. Der Button **Extern öffnen** bleibt deshalb als Fallback erhalten.

## Voraussetzungen

- Foundry VTT 13 oder neuer
- Getestete Zielgeneration im Manifest: Foundry VTT 14
- Internetzugriff des Browsers auf `https://avesmaps.de/`

## Installation über Foundry

Nach dem ersten GitHub-Release lautet die Manifest-URL:

```text
https://github.com/DEIN-GITHUB-NAME/DEIN-REPO/releases/latest/download/module.json
```

In Foundry:

1. **Setup → Add-on Modules → Install Module**
2. Manifest-URL einfügen
3. **Install**
4. Welt öffnen
5. **Manage Modules / Module verwalten → Avesmaps for Foundry** aktivieren

## Benutzung

- Avesmaps-Button in den Scene Controls
- Tastenkürzel: **Shift+A**
- Einstellungen unter den Moduleinstellungen:
  - Avesmaps-Basis-URL
  - Zugriff für Spieler erlauben

### Makro-/Deep-Link-API

```js
await game.modules.get("avesmaps-foundry").api.open();
await game.modules.get("avesmaps-foundry").api.settlement("Gareth");
await game.modules.get("avesmaps-foundry").api.region("Nordmarken");
await game.modules.get("avesmaps-foundry").api.state("Mittelreich");
await game.modules.get("avesmaps-foundry").api.road("Reichsstraße 1");
await game.modules.get("avesmaps-foundry").api.river("Großer Fluss");
```

## Ersten Release erstellen

Das Repository enthält eine GitHub Action. Sie baut bei jedem Tag `vX.Y.Z` automatisch:

- `module.json` mit korrekten GitHub-URLs
- `module.zip`
- einen GitHub Release

Beispiel mit Git:

```bash
git add .
git commit -m "Initial release"
git push
git tag v0.1.0
git push origin v0.1.0
```

Danach kann Foundry immer über diese stabile URL installieren und Updates finden:

```text
https://github.com/DEIN-GITHUB-NAME/DEIN-REPO/releases/latest/download/module.json
```

### Nur über die GitHub-Webseite

Das geht komplett ohne Git auf deinem Rechner:

1. Repository erstellen und die entpackten Dateien hochladen.
2. **Actions → Build Foundry release** öffnen.
3. **Run workflow** wählen.
4. Version `0.1.0` eintragen und starten.
5. Die Action erstellt automatisch den Tag `v0.1.0`, den GitHub Release sowie `module.json` und `module.zip`.

Alternativ löst auch ein gepushter Tag wie `v0.1.0` denselben Workflow aus.

## Release-Struktur

Die automatisch erzeugte `module.zip` enthält `module.json` direkt im ZIP-Stamm, zusammen mit `scripts/`, `styles/` und `templates/`. Das entspricht dem Foundry-Installationsmodell über die `download`-URL des Manifests.
