# Release-Checkliste – komplett im Browser

1. Auf GitHub ein neues Repository erstellen, z. B. `avesmaps-foundry`.
2. Für die einfachste Foundry-Installation das Repository **public** anlegen, damit die VM die Release-Dateien ohne GitHub-Anmeldung laden kann.
3. Das Template-ZIP lokal entpacken und **den Inhalt des Ordners** ins Repository hochladen. `module.json` muss im Repository-Stamm liegen und `.github/workflows/release.yml` muss vorhanden sein.
4. Repository öffnen → **Actions** → **Build Foundry release**.
5. **Run workflow** → Version `0.1.0` → starten.
6. Nach erfolgreichem Lauf unter **Releases** prüfen: Es müssen `module.json` und `module.zip` vorhanden sein.
7. Manifest-URL kopieren:
   `https://github.com/<OWNER>/<REPO>/releases/latest/download/module.json`
8. In Foundry: **Setup → Add-on Modules → Install Module → Manifest URL**.
9. Welt öffnen → **Module verwalten** → **Avesmaps for Foundry** aktivieren.
10. Test: Scene-Control-Button oder **Shift+A**.
