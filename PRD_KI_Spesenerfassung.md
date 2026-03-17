# PRODUCT REQUIREMENTS DOCUMENT
## KI-gestützte Reisekostenerfassung
### Intelligente Belegerfassung, Tagespauschalen & Kilometerabrechnung

---

| Feld | Wert |
|---|---|
| **Version** | 1.0 – Initial Draft |
| **Datum** | März 2026 |
| **Autor** | Jochen (CTO) |
| **Status** | Draft – zur Review |
| **Scope** | Erfassungs-Experience (v1) – kein Approval-Workflow |
| **Referenz-Produkte** | Spesenfuchs.de, Rydoo, Expensify, SAP Concur |
| **Rechtliche Basis** | § 9 EStG (Reisekosten), BMF-Schreiben Tagespauschalen 2024 |

---

## 1. Executive Summary

Die Erfassung von Reisekosten – Belege, Tagespauschalen, Kilometer, Mahlzeitenabzüge – ist für Mitarbeitende und Selbstständige in Deutschland heute unnötig aufwendig und fehleranfällig. Bestehende Tools wie Spesenfuchs, Rydoo oder SAP Concur lösen die Erfassung nur unvollständig: Entweder ist die App zu komplex (Concur), zu wenig kontextbewusst (Spesenfuchs) oder hat keine vollständige deutsche Rechtskonformität für alle Kostenarten.

Dieses PRD beschreibt ein neues Erfassungsprodukt, das KI konsequent einsetzt, um den manuellen Eingabeaufwand auf ein Minimum zu reduzieren. Kernprinzip: Der Nutzer fotografiert oder uploaded einen Beleg – die App extrahiert alle relevanten Daten automatisch, leitet Tagespauschalen und Mahlzeitenabzüge aus Reisedaten ab und berechnet Kilometerpauschalen auf Basis des hinterlegten Profils. Das Ergebnis: Eine vollständig ausgefüllte Abrechnung in unter 60 Sekunden pro Tag.

---

## 2. Problem Statement

### 2.1 Kernproblem

Mitarbeitende, Außendienstler und Freiberufler in Deutschland verlieren durchschnittlich 30–60 Minuten pro Dienstreise mit manueller Belegerfassung und Berechnung von Pauschalen. Die Hauptprobleme im Status Quo:

- **Manuelle Dateneingabe:** Datum, Betrag, MwSt-Satz, Empfänger, Kostenstelle – alles manuell.
- **Komplexe Tagespauschalen-Logik:** Mindestabwesenheitsdauer (8h/24h), Auslands- vs. Inlandspauschalen, Abzüge für gestellte Mahlzeiten (Frühstück −20%, Mittag/Abend −40%) – wenige Nutzer kennen alle Regeln.
- **Kilometerabrechnung:** Fahrtrouten werden oft geschätzt, Zwischenstopps vergessen, das eigene Fahrzeug-Profil (PKW 0,30 €/km, Motorrad 0,20 €/km) muss manuell gepflegt werden.
- **Keine kontextuellen Annahmen:** Tools fragen alles ab, auch wenn Profildaten (Wohnort, Fahrzeug, Arbeitgeber) die Antwort schon liefern würden.
- **Fehlende Fotoextraktion mit KI:** OCR-basierte Lösungen scheitern an unleserlichen Kassenbons, Fremdwährungen und Multi-MwSt-Belegen.

### 2.2 Betroffene Nutzer

- Außendienstmitarbeitende mit mehreren Dienstreisen pro Woche (primäre Zielgruppe)
- Projektmitarbeiter mit gelegentlichen Reisen (1–3×/Monat)
- Freiberufler & Selbstständige ohne eigene Buchhaltungsabteilung
- CTOs / Führungskräfte mit vielen Reisen, wenig Zeit für Administration

### 2.3 Kosten des Status Quo

- **Zeitverlust:** 30–90 Min. Nachbearbeitungszeit pro Reise
- **Fehleranfälligkeit:** Falsch berechnete Tagespauschalen führen zu steuerlichen Korrekturen
- **Frustration:** Abrechnung wird auf die lange Bank geschoben → Verzögerungen im Erstattungsprozess
- **Compliance-Risiko:** Fehlende Belege oder falsche Abzüge bei Betriebsprüfung

---

## 3. Ziele (Goals)

### 3.1 Nutzerziele

| Ziel | Messung | Target |
|---|---|---|
| Zeitersparnis bei Erfassung | Ø Minuten von Foto bis abgesendete Abrechnung | < 2 Min. pro Beleg / < 10 Min. pro Reisetag |
| KI-Extraktionsgenauigkeit | % korrekt extrahierter Felder ohne manuelle Korrektur | > 90% bei deutschen Belegen (Kassenbons, Rechnungen) |
| Vollständigkeit Tagespauschalen | % automatisch korrekt berechneter Tagespauschalen | > 95% ohne Nutzerkorrektur |
| Nutzerakzeptanz | Task Completion Rate beim ersten Durchlauf | > 80% ohne Hilfe-Anfrage |
| Fehlerreduktion | % Abrechnungen ohne manuelle Korrektur nach Einreichung | < 5% Korrekturquote |

### 3.2 Business-Ziele

- Produkt-Differenzierung gegenüber Spesenfuchs und Rydoo durch überlegene KI-Extraktionsqualität
- Grundlage für zukünftige ERP-Integration (enventa Trade, Fashion, construct) als eigenständiges Modul
- Aktivierungsrate: > 60% der Nutzer erfassen innerhalb der ersten 3 Tage einen Beleg via KI
- Retention: > 70% der Nutzer kehren in Woche 2 zurück

---

## 4. Non-Goals (Explizit Außer-Scope für v1)

| Nicht in Scope (v1) | Begründung |
|---|---|
| **Genehmigungsworkflow (Approval)** | Explizit ausgeschlossen – separates Modul in v2. Fokus liegt auf Erfassungsqualität. |
| **Buchhaltungs-/ERP-Integration** | API-Anbindung an DATEV, SAP, enventa ERP ist v2-Scope. v1 exportiert PDF/Excel. |
| **Kreditkartenimport / Banking-Sync** | Komplexe Authentifizierung, PSD2-Compliance – zu aufwendig für v1. |
| **Reisebuchung / Vor-Genehmigung** | Out of scope. Nur Nacherfassung von Ist-Kosten. |
| **Multi-Mandanten / Team-Verwaltung** | Einzelnutzer-Experience zuerst. Team-Features in v2. |
| **Auslands-Komplettabdeckung (>50 Länder)** | v1 deckt DE/AT/CH + Top-20-Destinationen ab. Vollständige Länderdatenbank in v2. |
| **Kilometerberechnung via GPS-Live-Tracking** | Datenschutz-komplex. v1 nutzt manuelle Start/Ziel-Eingabe + Google Maps API. |

---

## 5. User Stories

### 5.1 Primäre Persona: Der Außendienstler

**Michael S., 38, Key Account Manager, 3–4 Dienstreisen/Woche, nutzt iPhone, hates Papierkram. Sein Ziel: Beleg fotografieren → fertig.**

| ID | Als … möchte ich … | … damit … | Akzeptanzkriterium |
|---|---|---|---|
| US-01 | Als Außendienstler möchte ich einen Kassenbon mit der Kamera einscannen | ich die Daten nicht manuell eingeben muss und trotzdem GoBD-konform dokumentiert bin | Foto aufnehmen → KI extrahiert Datum, Betrag, MwSt, Händler → Felder vorausgefüllt → 1-Tap Bestätigung |
| US-02 | Als Außendienstler möchte ich am Ende eines Reisetages meine Tagespauschale automatisch berechnet bekommen | ich weiß, was mir zusteht ohne die BMF-Tabelle nachschlagen zu müssen | System erkennt Abwesenheitsdauer aus Kalender/Eingabe → zeigt Pauschale + eventuelle Mahlzeitenabzüge an |
| US-03 | Als Außendienstler möchte ich Fahrtkosten durch Eingabe von Start- und Zielort erfassen | die Kilometer automatisch berechnet werden und die gesetzliche Pauschale angewendet wird | Start/Ziel eingeben → Google Maps Entfernung → × 0,30 € (PKW) → Ergebnis sofort sichtbar |
| US-04 | Als Außendienstler möchte ich, dass das System weiß, dass mein Frühstück im Hotel bereits inklusive war | es den korrekten Abzug von 20% der Tagespauschale automatisch vornimmt | Übernachtungsbeleg erkannt → System fragt „Frühstück inklusive?" → Abzug automatisch berechnet |
| US-05 | Als Außendienstler möchte ich mehrere Belege auf einmal hochladen (z.B. am Abend im Hotel) | ich alle Belege eines Tages in einem Schwung erfassen kann | Multi-Upload → Batch-OCR → alle Belege als Liste zur Durchsicht → Sammelbestätigung |
| US-06 | Als Außendienstler möchte ich eine Belegerkennung auch für unleserliche oder zerknitterte Kassenbons | ich auch unter schwierigen Bedingungen erfolgreich scannen kann | Foto-Qualitäts-Hinweis bei schlechtem Bild → Nachbearbeitung via Bildoptimierung vor OCR |

### 5.2 Sekundäre Persona: Der Freiberufler / Selbstständige

**Julia K., 34, IT-Consultant, stellt ihren Kunden Reisekosten in Rechnung. Braucht GoBD-konforme Belege und korrekte steuerliche Erfassung für die nächste Steuererklärung.**

| ID | Als … möchte ich … | … damit … | Akzeptanzkriterium |
|---|---|---|---|
| US-07 | Als Freiberuflerin möchte ich meine Belege nach Kunden/Projekten kategorisieren | ich Reisekosten gezielt an Kunden weiterberechnen kann | Beleg-Erfassung hat optionales Feld „Projekt/Kunde" → Auswahl aus Dropdown (aus Profil) |
| US-08 | Als Freiberuflerin möchte ich eine Monatsübersicht aller Reisekosten als PDF exportieren | ich das Dokument direkt dem Steuerberater oder Kunden schicken kann | Export-Button → PDF mit Deckblatt, Belegliste, Summen nach Kostenkategorie, Originalbelege als Anhang |
| US-09 | Als Freiberuflerin möchte ich Auslandsbelege in Fremdwährung erfassen | der korrekte Tages-Wechselkurs automatisch angewendet wird | Währung erkannt → Tageskurs (ECB-Feed) abgerufen → EUR-Betrag angezeigt, Original-Betrag gespeichert |

### 5.3 Edge Cases & Fehlerszenarien

| ID | Als … möchte ich … | … damit … | Akzeptanzkriterium |
|---|---|---|---|
| US-10 | Als Nutzer, der einen unlesbaren Beleg hochlädt | ich eine klare Fehlermeldung erhalte und weiß, was ich tun soll | System zeigt: „Bild zu dunkel / unscharf" + Button „Nochmals fotografieren" oder „Manuell eingeben" |
| US-11 | Als Nutzer auf einer mehrtägigen Reise (3 Tage) möchte ich die Gesamtreise als eine Einheit anlegen | Tagespauschalen für alle Tage korrekt berechnet werden (Ankunfts-/Abreisetag = 14 € bei 24h+) | Reise-Assistent: Start- und Enddatum/-uhrzeit → Tagespauschalen automatisch für jeden Tag berechnet |
| US-12 | Als Nutzer, dem ein Mittagessen durch den Arbeitgeber gestellt wurde | der 40%-Abzug auf die Tagespauschale automatisch abgezogen wird | Toggle „Mahlzeit gestellt: Frühstück / Mittag / Abend" → Abzüge dynamisch eingeblendet |
| US-13 | Als Nutzer mit einem Multi-MwSt-Beleg (z.B. Supermarktrechnung) | ich mehrere Steuersätze (7% + 19%) auf einem Beleg erfassen kann | KI erkennt mehrere MwSt-Zeilen → UI erlaubt Split-Eingabe → Gesamtbetrag stimmt |

---

## 6. Anforderungen

> **Legende:** P0 = Must Have (nicht shippable ohne) | P1 = Should Have | P2 = Future / Parking Lot

### 6.1 Belegerfassung via KI (P0 – Must Have)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-01 | Foto-Upload: Nutzer kann Beleg fotografieren (Kamera-Access) oder Bild aus Galerie hochladen. Unterstützte Formate: JPG, PNG, HEIC, PDF. Max. 20 MB. | iOS + Android native Camera API. HEIC → JPG Konvertierung server-seitig. | P0 |
| REQ-02 | KI-Extraktion: Das System extrahiert automatisch: Datum, Gesamtbetrag, MwSt-Betrag(e) + Steuersatz(e), Händlername, Währung, Belegart (Restaurant/Taxi/Hotel/Tankstelle/Sonstiges). | Vision API (GPT-4o oder Claude) + strukturierter JSON-Output. Confidence-Score pro Feld. | P0 |
| REQ-03 | Feldbefüllung mit Editierbarkeit: Alle extrahierten Felder werden vorausgefüllt angezeigt. Nutzer kann jeden Wert vor Bestätigung ändern. Pflichtfelder: Datum, Betrag, Belegart. | Kein „Auto-Submit" – immer Review-Step. | P0 |
| REQ-04 | Konfidenzanzeige: Felder mit niedrigem Extraktions-Konfidenz (< 85%) werden visuell hervorgehoben (gelber Rahmen) und fordern aktive Bestätigung. | Verhindert stille Fehler. | P0 |
| REQ-05 | Multi-MwSt-Unterstützung: System erkennt Belege mit mehreren MwSt-Sätzen und erlaubt getrennte Erfassung (z.B. 19% + 7%). UI-Split-Komponente. | Typisch bei deutschen Supermarkt-Belegen. | P0 |
| REQ-06 | Belegtyp-Erkennung: Automatische Klassifikation in: Hotel, Restaurant/Bewirtung, Taxi/ÖPNV, Tankstelle, Parken, Bahn, Flug, Sonstiges. Jede Kategorie hat eigene Pflichtfelder. | Hotel → fragt nach Frühstück inklusive. Restaurant → fragt nach Bewirtungsanlass. | P0 |
| REQ-07 | Offline-Modus: Belege können offline fotografiert und lokal gespeichert werden. Sync erfolgt beim nächsten Internet-Verbindungsaufbau. | Wichtig für Nutzung in Zügen / schlechtem Netz. | P0 |
| REQ-08 | Batch-Upload: Nutzer kann bis zu 20 Belege auf einmal hochladen. KI verarbeitet alle parallel. Ergebnisse werden als Review-Liste angezeigt. | Für „Abend-Session" nach der Reise. | P0 |

### 6.2 Tagespauschalen (Verpflegungsmehraufwand) (P0)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-09 | Reise-Anlage: Nutzer legt eine Dienstreise an mit: Startdatum/-uhrzeit, Enddatum/-uhrzeit, Reiseziel (Stadt/Land), Zweck. | Grundlage für alle Pauschalenberechnungen. | P0 |
| REQ-10 | Inlands-Tagespauschalen (§ 9 Abs. 4a EStG): Automatische Berechnung: Abwesenheit > 8h → 14 €, Abwesenheit = 24h → 28 €, An-/Abreisetag bei mehrtägiger Reise → 14 €. Stets aktueller BMF-Stand. | Datenbank mit jährlichen BMF-Werten. Update-Mechanismus. | P0 |
| REQ-11 | Auslands-Tagespauschalen: Automatische Berechnung für Top-30-Reiseländer (DE, AT, CH, FR, GB, US, NL, IT, ES, PL, CZ, HU, BE, DK, SE, NO, FI, PT, GR, IE, JP, CN, SG, AE, AU + weitere). | Datenbank-gestützt, jährlich aktualisiert. | P0 |
| REQ-12 | Mahlzeitenabzüge: System erkennt gestellte Mahlzeiten (aus Hotelbelegerfassung oder manuell) und berechnet: Frühstück −20% (5,60 € inland), Mittag −40% (11,20 €), Abend −40% (11,20 €). Toggle pro Mahlzeit. | Abzüge sind auf den tatsächlichen Pauschalbetrag zu berechnen, nicht auf feste Eurobeträge bei Ausland. | P0 |
| REQ-13 | Zusammenfassung pro Reisetag: Für jeden Reisetag: Datum, Abwesenheitsstunden, anwendbare Pauschale, Abzüge, Netto-Pauschale. Klar und transparent dargestellt. | | P0 |
| REQ-14 | Profil-Vorausfüllung: Wohnort und typisches Reisemuster aus Nutzerprofil → System schlägt Reiseziel vor, falls aus Kalender-Integration erkennbar (optional: Kalender-Sync). | Kalender-Sync ist opt-in. | P1 |

### 6.3 Kilometerabrechnung (P0)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-15 | Fahrterfassung: Nutzer gibt Start- und Zielort (Freitextfeld mit Google Maps Autocomplete) sowie Datum an. Optional: Zwischenstopps, Anmerkung. | | P0 |
| REQ-16 | Automatische Entfernungsberechnung: Google Maps Distance Matrix API berechnet Entfernung in km. Nutzer kann Wert manuell überschreiben. | API-Kosten einkalkulieren. | P0 |
| REQ-17 | Fahrzeugprofil: Im Nutzerprofil hinterlegtes Fahrzeug bestimmt Pauschale: PKW 0,30 €/km, Motorrad 0,20 €/km, E-Bike (Dienst) 0,20 €/km. Profil-basiert vorausgefüllt. | Pauschale per 2024, gesetzliche Aktualisierung per Datenbank. | P0 |
| REQ-18 | Hin- und Rückfahrt: Toggle „Hin- und Rückfahrt" verdoppelt die Entfernung automatisch. | | P0 |
| REQ-19 | Heimarbeit / erste Tätigkeitsstätte: Unterscheidung ob Fahrt zur ersten Tätigkeitsstätte (Entfernungspauschale 0,30 € einfach) oder Dienstreise (0,30 € je km). System erklärt Unterschied. | Steuerlich relevante Differenzierung. | P0 |
| REQ-20 | Sammelfahrt-Erfassung: Mehrere Stopps einer Tagestour als eine Fahrt erfassen. Summe aller Teilstrecken = Gesamtkilometer. | Typisch im Außendienst. | P1 |

### 6.4 Nutzerprofil & KI-Annahmen (P0)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-21 | Pflichtprofil-Felder: Bei Ersteinrichtung: Name, Wohnort (PLZ/Stadt), Arbeitgeber, erste Tätigkeitsstätte (Ort), Fahrzeugtyp (PKW/Motorrad/ÖPNV), Beschäftigungsart (Angestellter / Selbstständig). | Grundlage für alle Auto-Annahmen. | P0 |
| REQ-22 | Optionale Profil-Felder: Kfz-Kennzeichen (für Nachweis), Bankverbindung (für Erstattungsnachweis), Standard-Kostenstelle, bevorzugte Währung, Steuerklasse, USt-ID (für Selbstständige). | | P1 |
| REQ-23 | Profilbasierte Vorausfüllung: System nutzt Profil-Daten für: Standard-Fahrzeugpauschale, Abwesenheitsort-Berechnung ab Wohnort, Inlands- vs. Auslandsreise-Erkennung. | Kein Abfragen von Daten, die im Profil bereits stehen. | P0 |
| REQ-24 | Lernende Vorschläge: System merkt sich häufige Eingaben (Reiseziele, Kategorien, Kostenstellen) und schlägt diese bevorzugt vor. | Client-seitiges Caching reicht für v1. | P1 |
| REQ-25 | Häufige Reiseziele: Nutzer kann in Profil „Favoriten-Reiseziele" anlegen (z.B. Kunde A in München, HQ in Hamburg) → 1-Tap-Auswahl bei Reise-Anlage. | | P1 |

### 6.5 Bewirtungsbeleg (P1)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-26 | Bewirtungsnachweis: Bei Belegart „Restaurant" wird zusätzlich abgefragt: Anlass der Bewirtung, Teilnehmer (Name + Firma), Gesamtbetrag inkl. Trinkgeld. GoBD-konformes Pflichtformular. | Steuerlich: 70% abzugsfähig. Formular muss vollständig sein. | P1 |
| REQ-27 | Trinkgeld-Erfassung: Separates Feld für Trinkgeld (nicht steuerpflichtiger Teil). Gesamtbeleg = Rechnungsbetrag + Trinkgeld. | | P1 |

### 6.6 Übersicht & Export (P0/P1)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-28 | Tagesübersicht: Pro Tag: Alle Belege, Tagespauschale, Fahrtkosten, Gesamtsumme. Klarer Status: ✓ vollständig / ⚠ unvollständig. | | P0 |
| REQ-29 | Reiseübersicht: Pro Dienstreise: Alle Tage, Gesamtkosten aufgeschlüsselt (Belege, Pauschalen, Fahrten). Druckansicht. | | P0 |
| REQ-30 | PDF-Export: Standardisierter PDF-Bericht mit: Deckblatt (Mitarbeiterdaten, Reisezeitraum, Gesamtbetrag), Tagespauschalen-Berechnung, Fahrtkosten-Tabelle, Belegliste mit Miniaturansichten, Originalbelege als Anhang. | GoBD-konform: Originalbelege müssen beigefügt sein. | P0 |
| REQ-31 | Excel/CSV-Export: Maschinenlesbarer Export für Buchhaltungssoftware. Spalten: Datum, Belegart, Betrag (netto/brutto), MwSt-Satz, Kategorie, Kostenstelle, Reisezweck. | | P1 |
| REQ-32 | Monats-Zusammenfassung: Aggregation aller Reisekosten eines Kalendermonats. Summen nach Kategorie, Trend-Vergleich Vormonat. | | P1 |

### 6.7 Technische & Compliance-Anforderungen (P0)

| ID | Anforderung / Akzeptanzkriterium | Notizen | Prio |
|---|---|---|---|
| REQ-33 | DSGVO / Datenschutz: Alle Daten werden DSGVO-konform auf EU-Servern gespeichert. AVV (Auftragsverarbeitungsvertrag) verfügbar. Datenlöschung auf Anfrage innerhalb 72h. | Kritisch für DE-Unternehmenskunden. | P0 |
| REQ-34 | GoBD-Konformität: Belege werden unveränderbar gespeichert (write-once). Jede Änderung wird versioniert protokolliert. Exportierte Abrechnungen erhalten Hashwert. | Für Betriebsprüfungssicherheit. | P0 |
| REQ-35 | Datensicherheit: Ende-zu-Ende-Verschlüsselung der Beleg-Uploads. Biometrische App-Sperre (Face ID / Fingerprint) als Option. | | P0 |
| REQ-36 | Belege-Aufbewahrung: Digitale Belege 10 Jahre abrufbar (§ 147 AO). Nutzer wird vor Ablauf der Aufbewahrungsfrist informiert. | | P1 |
| REQ-37 | Jährliche Pauschalen-Aktualisierung: BMF-Werte (Tagespauschalen, Kilometer, Auslandspauschalen) werden jährlich aktualisiert und automatisch eingespielt. Nutzer wird über Änderungen informiert. | Betrifft: 01.01. jedes Jahres. | P0 |

---

## 7. KI-Extraktions-Engine – Technische Spezifikation

### 7.1 Architektur

Die KI-Extraktion läuft in einer zweistufigen Pipeline:

1. **Vorverarbeitung:** Bildoptimierung (Entzerrung, Kontrast, Rotation) via OpenCV / ML-Modell. Ziel: OCR-optimiertes Bild.
2. **Extraktion:** Vision LLM (Claude Sonnet oder GPT-4o Vision) erhält optimiertes Bild + strukturierter System-Prompt für JSON-Output.
3. **Validierung:** Rule-Based Post-Processing: Datum-Plausibilität, MwSt-Konsistenz (Netto × Steuersatz = MwSt-Betrag ± 0,05 €), Betragsformat.
4. **Konfidenz-Scoring:** Jedes Feld bekommt Score 0–100. Felder < 85% werden dem Nutzer zur Bestätigung markiert.

### 7.2 Extraktion-Schema (JSON)

```json
{
  "date": "2024-03-15",
  "total_amount": 48.50,
  "currency": "EUR",
  "vat_positions": [
    { "rate": 0.19, "net": 35.71, "vat": 6.78, "gross": 42.49 },
    { "rate": 0.07, "net": 5.61, "vat": 0.39, "gross": 6.00 }
  ],
  "vendor_name": "Restaurant Zum Wirt",
  "vendor_city": "München",
  "receipt_type": "restaurant",
  "confidence": {
    "date": 95,
    "total_amount": 98,
    "vendor_name": 87,
    "vat_positions": 72
  }
}
```

### 7.3 Prompt-Strategie

- System-Prompt enthält: Deutsche MwSt-Regeln, typische Belegformate (Kassenbons, Rechnungen, Hotel-Rechnungen, Tankbelege)
- Few-Shot Examples für schwierige Belege (unleserlich, handgeschrieben, Fremdsprache)
- Explizite Anweisung: „Wenn unsicher, gib niedrigen Konfidenz-Score zurück, statt zu halluzinieren"
- Fallback: Wenn Vision-LLM Score < 50% → Manuelle Eingabe-Aufforderung

---

## 8. UX-Konzept & Screens

### 8.1 Haupt-User-Flow: Einzelbeleg

| Schritt | Screen / Aktion | KI / System |
|---|---|---|
| 1 | Home → „Beleg hinzufügen" (FAB-Button, prominent) | — |
| 2 | Kamera-Screen: Beleg-Rahmen als Overlay, Auto-Shutter wenn Beleg erkannt | Echtzeit-Belegerkennung im Viewfinder |
| 3 | Ladescreen: „Wird analysiert…" (max. 3 Sek.) | Vision LLM + Postprocessing |
| 4 | Review-Screen: Alle extrahierten Felder, unsichere Felder gelb markiert | Konfidenz-Score je Feld |
| 5 | Kontext-Fragen: Je nach Belegart (Hotel: „Frühstück inklusive?", Restaurant: „Bewirtungsanlass?") | Belegart bestimmt Zusatzfragen |
| 6 | Speichern → Beleg erscheint in Tagesliste | Unveränderbar gespeichert (GoBD) |

### 8.2 Haupt-User-Flow: Tagesabrechnung

- Nutzer öffnet „Reisetag" für heutiges Datum
- **Tagespauschalen-Widget:** Zeigt Abwesenheitsstunden, berechnete Pauschale, Mahlzeitenabzüge
- **Fahrten-Widget:** + Fahrt hinzufügen → Start/Ziel → km-Berechnung
- **Tages-Zusammenfassung:** Belege (€) + Pauschale (€) + Fahrten (€) = Gesamttag (€)
- **Status-Badge:** ✓ Vollständig / ⚠ X Felder fehlen

### 8.3 Navigation & Struktur

| Tab | Inhalt |
|---|---|
| Tab 1 – Heute | Schnellzugriff Beleg-Upload + Tages-Status |
| Tab 2 – Reisen | Liste aller Dienstreisen, Zeitraum, Gesamtkosten |
| Tab 3 – Belege | Alle Belege chronologisch, filterbar nach Kategorie/Status |
| Tab 4 – Profil | Nutzerdaten, Fahrzeug, Favoriten, Export-Einstellungen |
| FAB (überall) | „Beleg scannen" – immer zugänglich |

---

## 9. Erfolgsmetriken

| Metrik | Ziel (Success) | Ziel (Stretch) | Messung |
|---|---|---|---|
| Extraction Accuracy | > 90% korrekte Felder | > 95% | A/B-Logging: extrahiert vs. manuell korrigiert |
| Time-to-Submit pro Beleg | < 90 Sek. | < 45 Sek. | App-Telemetrie: Foto-Tap bis Speichern |
| Task Completion Rate (Onboarding) | > 80% schließen ersten Beleg ab | > 90% | Funnel-Analyse Woche 1 |
| 7-Day Retention | > 50% | > 65% | Unique Sessions Tag 7 nach Registration |
| Pauschalenberechnung Fehlerrate | < 5% Korrekturen nachträglich | < 2% | Vergleich berechnete vs. manuell geänderte Werte |
| App Store Rating | ≥ 4,3 Sterne | ≥ 4,6 Sterne | App Store / Play Store, 30 Tage nach Launch |
| Export Usage | > 40% der Nutzer exportieren im Monat 1 | > 60% | Export-Button-Klicks pro MAU |

---

## 10. Offene Fragen

| # | Frage | Verantwortlich | Blocking? |
|---|---|---|---|
| Q1 | Vision LLM: Claude vs. GPT-4o – Kostenvergleich pro 1.000 Belege? Welches Modell hat bessere DE-Kassenbons-Performance? | Engineering / Product | **JA** (Architektur) |
| Q2 | Google Maps API Kosten bei skalierten Nutzerzahlen – ab wann eigenes Geocoding-Modell? | Engineering | Nein |
| Q3 | GoBD: Reicht Cloud-Speicherung mit Hashwert oder benötigen Unternehmenskunden On-Premise-Option? | Legal / Product | **JA** (v1 Scope) |
| Q4 | Kalender-Sync (Google/Outlook): Opt-in für automatische Reiseziel-Erkennung – rechtlich unbedenklich ohne expliziten AVV? | Legal | Nein (P1 Feature) |
| Q5 | Steuerberaterhaftung: Darf App explizite Steuerhinweise geben („Dies ist steuerlich absetzbar") oder nur neutrale Berechnung? | Legal | **JA** (Texte/UX) |
| Q6 | Freiberufler vs. Angestellte: Unterschiedliche Regeln (§ 4 vs. § 9 EStG) – v1 beide oder nur Angestellte? | Product | **JA** (Scope) |
| Q7 | Auslands-Pauschalen-DB: Lizenz kaufen (z.B. von spezialisierten Anbietern) oder selbst pflegen? | Product / Legal | **JA** (Make vs. Buy) |
| Q8 | Mehrere Fahrzeuge pro Nutzer (Dienstwagen + Privat): Wie auswählen bei Fahrterfassung? | Product | Nein (P1) |

---

## 11. Phasierung & Timeline

| Phase | Zeitraum | Inhalte |
|---|---|---|
| **Alpha / PoC** | Monat 1–2 | KI-Extraktions-Pipeline (REQ-01–06), manuelles Profil, Einzel-Beleg-Review, lokaler Speicher. Ziel: Extraktionsqualität validieren. |
| **Beta v0.1** | Monat 3–4 | Tagespauschalen-Berechnung (REQ-09–13), Kilometer-Erfassung (REQ-15–19), PDF-Export (REQ-30), DSGVO-Basis-Compliance. Interne Tester. |
| **v1.0 Launch** | Monat 5–6 | Alle P0-Anforderungen. Profil-System vollständig, Offline-Modus, GoBD-Konformität, App Store Submission (iOS + Android). |
| **v1.1** | Monat 7–8 | P1-Features: Batch-Upload, Lernende Vorschläge, Favoriten, Bewirtungsbeleg, Excel-Export, Monats-Zusammenfassung. |
| **v2.0** | Monat 9–12 | Approval-Workflow, ERP-Integration (enventa, DATEV), Team-Verwaltung, vollständige Auslands-DB, Kreditkarten-Sync. |

---

## 12. Wettbewerbsanalyse

| Feature | **Dieses PRD** | Spesenfuchs | Rydoo | SAP Concur |
|---|---|---|---|---|
| KI-Belegextraktion (Vision LLM) | ✓✓ State-of-the-art | ✓ OCR-basiert | ✓ OCR | ✓ OCR |
| Multi-MwSt pro Beleg | ✓ Vollständig | ✓ | Eingeschränkt | ✓ |
| DE Tagespauschalen § 9 | ✓ Automatisch + Abzüge | ✓ Manuell | ✓ | ✓ |
| Mahlzeiten-Abzüge automatisch | ✓ KI-gestützt | Manuell | Manuell | Manuell |
| Kilometer-Pauschale + Maps | ✓ | ✓ | ✓ | ✓ |
| Profil-basierte Annahmen | ✓ Umfassend | Basis | Basis | Erweitert |
| Offline-Modus | ✓ | Teilweise | Nein | Ja |
| Bewirtungsbeleg GoBD | ✓ (P1) | ✓ | Eingeschränkt | ✓ |
| Approval Workflow | v2 (kein v1-Scope) | ✓ | ✓ | ✓✓ |
| ERP-Integration | v2 | Eingeschränkt | Eingeschränkt | ✓✓ |
| Preisklasse (Einzel) | TBD | < 5 €/Mon. | ab 8 €/Mon. | ab 20 €/Mon. |

---

## Appendix A: Gesetzliche Tagespauschalen 2024 (Inland)

| Abwesenheitsfall | Pauschale | Abzug Frühstück | Abzug Mittag / Abend |
|---|---|---|---|
| Abwesenheit ≥ 8 Stunden (kein Übernachtung) | 14,00 € | 2,80 € | 5,60 € |
| Abwesenheit = 24 Stunden | 28,00 € | 5,60 € | 11,20 € |
| Ankunfts-/Abreisetag (mehrtäg. Reise) | 14,00 € | 2,80 € | 5,60 € |
| < 8 Stunden Abwesenheit | 0,00 € | — | — |

> **Quelle:** § 9 Abs. 4a EStG i.V.m. BMF-Schreiben zu steuerfreien Reisekostenpauschalen. Stand: 2024. Die Werte gelten für Inlandsreisen. Auslandspauschalen variieren nach Land und werden jährlich im BMF-Schreiben veröffentlicht.

---

## Appendix B: Kilometerpauschalensätze 2024

- **PKW:** 0,30 € pro km (§ 9 Abs. 1 Satz 3 Nr. 4a EStG)
- **Motorrad / Roller:** 0,20 € pro km
- **Zur ersten Tätigkeitsstätte (Entfernungspauschale):** 0,30 € für die ersten 20 km, 0,38 € ab dem 21. km (einfache Strecke)
- **Dienstwagen:** Keine Pauschale – tatsächliche Kosten oder 1%-Regelung

---

*— Ende des Dokuments —*
