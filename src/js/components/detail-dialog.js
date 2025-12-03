/**
 * Detail-Dialog
 * Zeigt Mitarbeiter-Details mit allen Einträgen des Jahres
 * Ermöglicht Bearbeitung und Jahr-Navigation
 */

class DetailDialog extends DialogBase {
  constructor(dataManager) {
    super(dataManager);
    this.currentMitarbeiterId = null;
    this.currentJahr = null;
  }

  /**
   * Zeigt Detail-Ansicht für einen Mitarbeiter
   */
  async zeigeDetails(mitarbeiterId, jahr = null) {
    this.currentMitarbeiterId = mitarbeiterId;
    this.currentJahr = jahr || this.dataManager.aktuellesJahr;

    const stat = await this.getMitarbeiterStatistikFuerJahr(mitarbeiterId, this.currentJahr);
    if (!stat) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    const ma = stat.mitarbeiter;

    // Lade alle Einträge für das Jahr
    const eintraege = await this.ladeAlleEintraege(mitarbeiterId, this.currentJahr);

    const modalHtml = `
      <div class="modal fade" id="detailsModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-person-badge"></i> ${ma.vorname} ${ma.nachname}
                <span class="badge bg-light text-dark ms-2">${ma.abteilung_name}</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <!-- Jahr-Navigation -->
              <div class="d-flex justify-content-between align-items-center mb-4">
                <button class="btn btn-outline-secondary" id="btnVorigesJahr">
                  <i class="bi bi-chevron-left"></i> ${this.currentJahr - 1}
                </button>
                <h4 class="mb-0">
                  <i class="bi bi-calendar3"></i> Jahr ${this.currentJahr}
                </h4>
                <button class="btn btn-outline-secondary" id="btnNaechstesJahr">
                  ${this.currentJahr + 1} <i class="bi bi-chevron-right"></i>
                </button>
              </div>

              <div class="row">
                <!-- Statistik-Übersicht -->
                <div class="col-md-4">
                  <div class="card bg-dark mb-3">
                    <div class="card-header">
                      <i class="bi bi-bar-chart"></i> Übersicht ${this.currentJahr}
                    </div>
                    <div class="card-body">
                      <table class="table table-sm table-dark mb-0">
                        <tr>
                          <td>Anspruch:</td>
                          <td class="text-end">${stat.urlaubsanspruch.toFixed(1)} Tage</td>
                        </tr>
                        <tr>
                          <td>Übertrag:</td>
                          <td class="text-end text-info">${stat.uebertrag_vorjahr.toFixed(1)} Tage</td>
                        </tr>
                        <tr class="table-active">
                          <td><strong>Verfügbar:</strong></td>
                          <td class="text-end"><strong>${stat.urlaub_verfuegbar.toFixed(1)} Tage</strong></td>
                        </tr>
                        <tr>
                          <td>Genommen:</td>
                          <td class="text-end text-success">${stat.urlaub_genommen.toFixed(1)} Tage</td>
                        </tr>
                        <tr class="table-active">
                          <td><strong>Rest:</strong></td>
                          <td class="text-end ${stat.urlaub_rest < 0 ? 'text-danger' : 'text-success'}">
                            <strong>${stat.urlaub_rest.toFixed(1)} Tage</strong>
                          </td>
                        </tr>
                        <tr><td colspan="2"><hr class="my-1"></td></tr>
                        <tr>
                          <td>Krankheit:</td>
                          <td class="text-end text-danger">${stat.krankheitstage.toFixed(1)} Tage</td>
                        </tr>
                        <tr>
                          <td>Schulung:</td>
                          <td class="text-end text-info">${stat.schulungstage.toFixed(1)} Tage</td>
                        </tr>
                        <tr>
                          <td>Überstunden:</td>
                          <td class="text-end text-warning">${stat.ueberstunden.toFixed(1)} Std.</td>
                        </tr>
                      </table>
                    </div>
                  </div>

                  <!-- Stammdaten -->
                  <div class="card bg-dark">
                    <div class="card-header">
                      <i class="bi bi-person"></i> Stammdaten
                    </div>
                    <div class="card-body">
                      <table class="table table-sm table-dark mb-0">
                        <tr>
                          <td>ID:</td>
                          <td class="text-end"><code>${ma.id}</code></td>
                        </tr>
                        <tr>
                          <td>Geburtsdatum:</td>
                          <td class="text-end">${ma.geburtsdatum ? new Date(ma.geburtsdatum).toLocaleDateString('de-DE') : '-'}</td>
                        </tr>
                        <tr>
                          <td>Eintritt:</td>
                          <td class="text-end">${new Date(ma.eintrittsdatum).toLocaleDateString('de-DE')}</td>
                        </tr>
                        <tr>
                          <td>Urlaubstage/Jahr:</td>
                          <td class="text-end">${ma.urlaubstage_jahr}</td>
                        </tr>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Einträge-Tabellen -->
                <div class="col-md-8">
                  ${this._erstelleEintraegeHTML(eintraege)}
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Entferne alte Modals
    const oldModals = document.querySelectorAll('.modal');
    oldModals.forEach(m => {
      const existingModal = bootstrap.Modal.getInstance(m);
      if (existingModal) existingModal.dispose();
      m.remove();
    });

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalElement = document.querySelector('#detailsModal');
    const modal = new bootstrap.Modal(modalElement);

    // Jahr-Navigation Event-Listener
    modalElement.querySelector('#btnVorigesJahr').addEventListener('click', async () => {
      modal.hide();
      setTimeout(() => this.zeigeDetails(mitarbeiterId, this.currentJahr - 1), 300);
    });

    modalElement.querySelector('#btnNaechstesJahr').addEventListener('click', async () => {
      modal.hide();
      setTimeout(() => this.zeigeDetails(mitarbeiterId, this.currentJahr + 1), 300);
    });

    // Event-Delegation für Bearbeiten/Löschen Buttons
    modalElement.addEventListener('click', async (e) => {
      const bearbeitenBtn = e.target.closest('.btn-eintrag-bearbeiten');
      const loeschenBtn = e.target.closest('.btn-eintrag-loeschen');

      if (bearbeitenBtn) {
        const typ = bearbeitenBtn.dataset.typ;
        const id = parseInt(bearbeitenBtn.dataset.id);
        modal.hide();
        await this.zeigeEintragBearbeiten(typ, id, async () => {
          setTimeout(() => this.zeigeDetails(mitarbeiterId, this.currentJahr), 300);
        });
      } else if (loeschenBtn) {
        const typ = loeschenBtn.dataset.typ;
        const id = parseInt(loeschenBtn.dataset.id);
        
        if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
          try {
            await this.loescheEintrag(typ, id);
            showNotification('Erfolg', 'Eintrag wurde gelöscht', 'success');
            modal.hide();
            setTimeout(() => this.zeigeDetails(mitarbeiterId, this.currentJahr), 300);
          } catch (error) {
            showNotification('Fehler', error.message, 'danger');
          }
        }
      }
    });

    modal.show();

    modalElement.addEventListener('hidden.bs.modal', () => {
      modal.dispose();
      modalElement.remove();
    });
  }

  /**
   * Berechnet Statistik für ein spezifisches Jahr
   */
  async getMitarbeiterStatistikFuerJahr(mitarbeiterId, jahr) {
    const mitarbeiterResult = await this.dataManager.db.get(`
      SELECT m.*, a.name as abteilung_name, a.farbe as abteilung_farbe
      FROM mitarbeiter m
      LEFT JOIN abteilungen a ON m.abteilung_id = a.id
      WHERE m.id = ?
    `, [mitarbeiterId]);

    if (!mitarbeiterResult.success || !mitarbeiterResult.data) return null;
    
    const mitarbeiter = mitarbeiterResult.data;

    // Übertrag berechnen für das gewählte Jahr
    const uebertrag = await this.berechneUebertragFuerJahr(mitarbeiterId, jahr, mitarbeiter);

    // Anteiligen Urlaubsanspruch berechnen
    const urlaubsanspruch = this.dataManager.berechneAnteiligenUrlaub(mitarbeiter, jahr);

    // Urlaub genommen
    const urlaubResult = await this.dataManager.db.get(`
      SELECT COALESCE(SUM(tage), 0) as summe
      FROM urlaub
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
    `, [mitarbeiterId, jahr.toString()]);

    // Krankheitstage
    const krankheitResult = await this.dataManager.db.get(`
      SELECT COALESCE(SUM(tage), 0) as summe
      FROM krankheit
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
    `, [mitarbeiterId, jahr.toString()]);

    // Schulungstage
    const schulungResult = await this.dataManager.db.get(`
      SELECT COALESCE(SUM(dauer_tage), 0) as summe
      FROM schulung
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
    `, [mitarbeiterId, jahr.toString()]);

    // Überstunden
    const ueberstundenResult = await this.dataManager.db.get(`
      SELECT COALESCE(SUM(stunden), 0) as summe
      FROM ueberstunden
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
    `, [mitarbeiterId, jahr.toString()]);

    const urlaubGenommen = (urlaubResult.success && urlaubResult.data) ? urlaubResult.data.summe : 0;

    return {
      mitarbeiter,
      urlaubsanspruch,
      uebertrag_vorjahr: uebertrag,
      urlaub_verfuegbar: urlaubsanspruch + uebertrag,
      urlaub_genommen: urlaubGenommen,
      urlaub_rest: urlaubsanspruch + uebertrag - urlaubGenommen,
      krankheitstage: (krankheitResult.success && krankheitResult.data) ? krankheitResult.data.summe : 0,
      schulungstage: (schulungResult.success && schulungResult.data) ? schulungResult.data.summe : 0,
      ueberstunden: (ueberstundenResult.success && ueberstundenResult.data) ? ueberstundenResult.data.summe : 0
    };
  }

  /**
   * Berechnet Übertrag für ein spezifisches Jahr
   */
  async berechneUebertragFuerJahr(mitarbeiterId, jahr, mitarbeiter) {
    const vorjahr = jahr - 1;
    const eintrittsjahr = new Date(mitarbeiter.eintrittsdatum).getFullYear();

    if (vorjahr < eintrittsjahr) return 0;

    const uebertragVorvorjahr = await this.berechneUebertragFuerJahr(mitarbeiterId, vorjahr, mitarbeiter);
    const urlaubsanspruchVorjahr = this.dataManager.berechneAnteiligenUrlaub(mitarbeiter, vorjahr);
    const verfuegbarVorjahr = urlaubsanspruchVorjahr + uebertragVorvorjahr;

    const genommenResult = await this.dataManager.db.get(`
      SELECT COALESCE(SUM(tage), 0) as summe
      FROM urlaub
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
    `, [mitarbeiterId, vorjahr.toString()]);

    const genommenVorjahr = (genommenResult.success && genommenResult.data) ? genommenResult.data.summe : 0;
    const rest = verfuegbarVorjahr - genommenVorjahr;

    return Math.min(Math.max(rest, 0), 30);
  }

  /**
   * Lädt alle Einträge für einen Mitarbeiter und Jahr
   */
  async ladeAlleEintraege(mitarbeiterId, jahr) {
    const jahrStr = jahr.toString();
    const eintraege = {
      urlaub: [],
      krankheit: [],
      schulung: [],
      ueberstunden: []
    };

    // Urlaub
    const urlaubResult = await this.dataManager.db.query(`
      SELECT id, von_datum, bis_datum, tage, notiz, erstellt_am
      FROM urlaub
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
      ORDER BY von_datum DESC
    `, [mitarbeiterId, jahrStr]);
    if (urlaubResult.success) eintraege.urlaub = urlaubResult.data;

    // Krankheit
    const krankheitResult = await this.dataManager.db.query(`
      SELECT id, von_datum, bis_datum, tage, notiz, erstellt_am
      FROM krankheit
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
      ORDER BY von_datum DESC
    `, [mitarbeiterId, jahrStr]);
    if (krankheitResult.success) eintraege.krankheit = krankheitResult.data;

    // Schulung
    const schulungResult = await this.dataManager.db.query(`
      SELECT id, datum, dauer_tage, titel, notiz, erstellt_am
      FROM schulung
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
      ORDER BY datum DESC
    `, [mitarbeiterId, jahrStr]);
    if (schulungResult.success) eintraege.schulung = schulungResult.data;

    // Überstunden
    const ueberstundenResult = await this.dataManager.db.query(`
      SELECT id, datum, stunden, notiz, erstellt_am
      FROM ueberstunden
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
      ORDER BY datum DESC
    `, [mitarbeiterId, jahrStr]);
    if (ueberstundenResult.success) eintraege.ueberstunden = ueberstundenResult.data;

    return eintraege;
  }

  /**
   * Erstellt HTML für alle Einträge-Tabellen
   */
  _erstelleEintraegeHTML(eintraege) {
    let html = '';

    // Urlaub-Tabelle
    html += this._erstelleEintragTabelle(
      'Urlaub',
      'calendar-check',
      'success',
      eintraege.urlaub,
      'urlaub',
      ['Zeitraum', 'Tage', 'Notiz', 'Aktionen'],
      (e) => `
        <tr>
          <td>${this._formatDatum(e.von_datum)} - ${this._formatDatum(e.bis_datum)}</td>
          <td>${e.tage.toFixed(1)}</td>
          <td>${e.notiz || '-'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-eintrag-bearbeiten" data-typ="urlaub" data-id="${e.id}" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-eintrag-loeschen" data-typ="urlaub" data-id="${e.id}" title="Löschen">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    );

    // Krankheit-Tabelle
    html += this._erstelleEintragTabelle(
      'Krankheit',
      'bandaid',
      'danger',
      eintraege.krankheit,
      'krankheit',
      ['Zeitraum', 'Tage', 'Notiz', 'Aktionen'],
      (e) => `
        <tr>
          <td>${this._formatDatum(e.von_datum)} - ${this._formatDatum(e.bis_datum)}</td>
          <td>${e.tage.toFixed(1)}</td>
          <td>${e.notiz || '-'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-eintrag-bearbeiten" data-typ="krankheit" data-id="${e.id}" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-eintrag-loeschen" data-typ="krankheit" data-id="${e.id}" title="Löschen">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    );

    // Schulung-Tabelle
    html += this._erstelleEintragTabelle(
      'Schulung',
      'book',
      'info',
      eintraege.schulung,
      'schulung',
      ['Datum', 'Dauer', 'Titel', 'Aktionen'],
      (e) => `
        <tr>
          <td>${this._formatDatum(e.datum)}</td>
          <td>${e.dauer_tage.toFixed(1)} Tage</td>
          <td>${e.titel || '-'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-eintrag-bearbeiten" data-typ="schulung" data-id="${e.id}" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-eintrag-loeschen" data-typ="schulung" data-id="${e.id}" title="Löschen">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    );

    // Überstunden-Tabelle
    html += this._erstelleEintragTabelle(
      'Überstunden',
      'clock',
      'warning',
      eintraege.ueberstunden,
      'ueberstunden',
      ['Datum', 'Stunden', 'Notiz', 'Aktionen'],
      (e) => `
        <tr>
          <td>${this._formatDatum(e.datum)}</td>
          <td class="${e.stunden >= 0 ? 'text-success' : 'text-danger'}">${e.stunden >= 0 ? '+' : ''}${e.stunden.toFixed(2)} Std.</td>
          <td>${e.notiz || '-'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-eintrag-bearbeiten" data-typ="ueberstunden" data-id="${e.id}" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-eintrag-loeschen" data-typ="ueberstunden" data-id="${e.id}" title="Löschen">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    );

    return html;
  }

  /**
   * Erstellt eine einzelne Eintrags-Tabelle
   */
  _erstelleEintragTabelle(titel, icon, farbe, eintraege, typ, headers, rowRenderer) {
    const summe = this._berechneSumme(eintraege, typ);
    
    return `
      <div class="card bg-dark mb-3">
        <div class="card-header bg-${farbe} text-${farbe === 'warning' ? 'dark' : 'white'} d-flex justify-content-between align-items-center">
          <span><i class="bi bi-${icon}"></i> ${titel}</span>
          <span class="badge bg-light text-dark">${eintraege.length} Einträge | ${summe}</span>
        </div>
        <div class="card-body p-0">
          ${eintraege.length > 0 ? `
            <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
              <table class="table table-sm table-dark table-hover mb-0">
                <thead>
                  <tr>
                    ${headers.map(h => `<th>${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${eintraege.map(rowRenderer).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center text-muted py-3">
              <i class="bi bi-inbox"></i> Keine Einträge vorhanden
            </div>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Berechnet Summe für einen Eintragstyp
   */
  _berechneSumme(eintraege, typ) {
    if (eintraege.length === 0) return '0';
    
    if (typ === 'ueberstunden') {
      const summe = eintraege.reduce((acc, e) => acc + e.stunden, 0);
      return `${summe >= 0 ? '+' : ''}${summe.toFixed(2)} Std.`;
    } else if (typ === 'schulung') {
      const summe = eintraege.reduce((acc, e) => acc + e.dauer_tage, 0);
      return `${summe.toFixed(1)} Tage`;
    } else {
      const summe = eintraege.reduce((acc, e) => acc + e.tage, 0);
      return `${summe.toFixed(1)} Tage`;
    }
  }

  /**
   * Formatiert Datum
   */
  _formatDatum(datum) {
    return new Date(datum).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Löscht einen Eintrag
   */
  async loescheEintrag(typ, id) {
    const tabellen = {
      urlaub: 'urlaub',
      krankheit: 'krankheit',
      schulung: 'schulung',
      ueberstunden: 'ueberstunden'
    };

    const tabelle = tabellen[typ];
    if (!tabelle) throw new Error(`Unbekannter Typ: ${typ}`);

    const result = await this.dataManager.db.run(`DELETE FROM ${tabelle} WHERE id = ?`, [id]);
    if (!result.success) throw new Error(result.error);

    this.dataManager.invalidateCache();
  }

  /**
   * Zeigt Dialog zum Bearbeiten eines Eintrags
   */
  async zeigeEintragBearbeiten(typ, id, callback) {
    const tabellen = {
      urlaub: 'urlaub',
      krankheit: 'krankheit',
      schulung: 'schulung',
      ueberstunden: 'ueberstunden'
    };

    const tabelle = tabellen[typ];
    if (!tabelle) {
      showNotification('Fehler', `Unbekannter Typ: ${typ}`, 'danger');
      return;
    }

    const result = await this.dataManager.db.get(`SELECT * FROM ${tabelle} WHERE id = ?`, [id]);
    if (!result.success || !result.data) {
      showNotification('Fehler', 'Eintrag nicht gefunden', 'danger');
      return;
    }

    const eintrag = result.data;

    if (typ === 'urlaub') {
      await this._zeigeUrlaubBearbeiten(eintrag, callback);
    } else if (typ === 'krankheit') {
      await this._zeigeKrankheitBearbeiten(eintrag, callback);
    } else if (typ === 'schulung') {
      await this._zeigeSchulungBearbeiten(eintrag, callback);
    } else if (typ === 'ueberstunden') {
      await this._zeigeUeberstundenBearbeiten(eintrag, callback);
    }
  }

  /**
   * Urlaub bearbeiten Dialog
   */
  async _zeigeUrlaubBearbeiten(eintrag, callback) {
    const modalHtml = `
      <div class="modal fade" id="urlaubBearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">
                <i class="bi bi-pencil-square"></i> Urlaub bearbeiten
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="urlaubBearbeitenForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Von *</label>
                    <input type="date" class="form-control" id="vonDatum" value="${eintrag.von_datum}" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Bis *</label>
                    <input type="date" class="form-control" id="bisDatum" value="${eintrag.bis_datum}" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Tage *</label>
                  <input type="number" class="form-control" id="tage" value="${eintrag.tage}" step="0.5" min="0.5" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Notiz</label>
                  <textarea class="form-control" id="notiz" rows="2">${eintrag.notiz || ''}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
              <button type="button" class="btn btn-success" id="btnSpeichern">
                <i class="bi bi-check-lg"></i> Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.showModal(modalHtml, async () => {
      const form = document.getElementById('urlaubBearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const updateResult = await this.dataManager.db.run(`
        UPDATE urlaub 
        SET von_datum = ?, bis_datum = ?, tage = ?, notiz = ?
        WHERE id = ?
      `, [
        document.getElementById('vonDatum').value,
        document.getElementById('bisDatum').value,
        parseFloat(document.getElementById('tage').value),
        document.getElementById('notiz').value || null,
        eintrag.id
      ]);

      if (!updateResult.success) {
        showNotification('Fehler', updateResult.error, 'danger');
        return false;
      }

      this.dataManager.invalidateCache();
      showNotification('Erfolg', 'Urlaub wurde aktualisiert', 'success');
      if (callback) await callback();
      return true;
    });
  }

  /**
   * Krankheit bearbeiten Dialog
   */
  async _zeigeKrankheitBearbeiten(eintrag, callback) {
    const modalHtml = `
      <div class="modal fade" id="krankheitBearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">
                <i class="bi bi-pencil-square"></i> Krankheit bearbeiten
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="krankheitBearbeitenForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Von *</label>
                    <input type="date" class="form-control" id="vonDatum" value="${eintrag.von_datum}" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Bis *</label>
                    <input type="date" class="form-control" id="bisDatum" value="${eintrag.bis_datum}" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Tage *</label>
                  <input type="number" class="form-control" id="tage" value="${eintrag.tage}" step="0.5" min="0.5" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Notiz</label>
                  <textarea class="form-control" id="notiz" rows="2">${eintrag.notiz || ''}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
              <button type="button" class="btn btn-danger" id="btnSpeichern">
                <i class="bi bi-check-lg"></i> Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.showModal(modalHtml, async () => {
      const form = document.getElementById('krankheitBearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const updateResult = await this.dataManager.db.run(`
        UPDATE krankheit 
        SET von_datum = ?, bis_datum = ?, tage = ?, notiz = ?
        WHERE id = ?
      `, [
        document.getElementById('vonDatum').value,
        document.getElementById('bisDatum').value,
        parseFloat(document.getElementById('tage').value),
        document.getElementById('notiz').value || null,
        eintrag.id
      ]);

      if (!updateResult.success) {
        showNotification('Fehler', updateResult.error, 'danger');
        return false;
      }

      this.dataManager.invalidateCache();
      showNotification('Erfolg', 'Krankheit wurde aktualisiert', 'success');
      if (callback) await callback();
      return true;
    });
  }

  /**
   * Schulung bearbeiten Dialog
   */
  async _zeigeSchulungBearbeiten(eintrag, callback) {
    const modalHtml = `
      <div class="modal fade" id="schulungBearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title">
                <i class="bi bi-pencil-square"></i> Schulung bearbeiten
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="schulungBearbeitenForm">
                <div class="mb-3">
                  <label class="form-label">Datum *</label>
                  <input type="date" class="form-control" id="datum" value="${eintrag.datum}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Dauer (Tage) *</label>
                  <input type="number" class="form-control" id="dauerTage" value="${eintrag.dauer_tage}" step="0.5" min="0.5" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Titel</label>
                  <input type="text" class="form-control" id="titel" value="${eintrag.titel || ''}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Notiz</label>
                  <textarea class="form-control" id="notiz" rows="2">${eintrag.notiz || ''}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
              <button type="button" class="btn btn-info" id="btnSpeichern">
                <i class="bi bi-check-lg"></i> Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.showModal(modalHtml, async () => {
      const form = document.getElementById('schulungBearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const updateResult = await this.dataManager.db.run(`
        UPDATE schulung 
        SET datum = ?, dauer_tage = ?, titel = ?, notiz = ?
        WHERE id = ?
      `, [
        document.getElementById('datum').value,
        parseFloat(document.getElementById('dauerTage').value),
        document.getElementById('titel').value || null,
        document.getElementById('notiz').value || null,
        eintrag.id
      ]);

      if (!updateResult.success) {
        showNotification('Fehler', updateResult.error, 'danger');
        return false;
      }

      this.dataManager.invalidateCache();
      showNotification('Erfolg', 'Schulung wurde aktualisiert', 'success');
      if (callback) await callback();
      return true;
    });
  }

  /**
   * Überstunden bearbeiten Dialog
   */
  async _zeigeUeberstundenBearbeiten(eintrag, callback) {
    const modalHtml = `
      <div class="modal fade" id="ueberstundenBearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title">
                <i class="bi bi-pencil-square"></i> Überstunden bearbeiten
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="ueberstundenBearbeitenForm">
                <div class="mb-3">
                  <label class="form-label">Datum *</label>
                  <input type="date" class="form-control" id="datum" value="${eintrag.datum}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Stunden *</label>
                  <input type="number" class="form-control" id="stunden" value="${eintrag.stunden}" step="0.25" required>
                  <small class="form-text text-muted">Positive Werte = aufgebaut, Negative = abgebaut</small>
                </div>
                <div class="mb-3">
                  <label class="form-label">Notiz</label>
                  <textarea class="form-control" id="notiz" rows="2">${eintrag.notiz || ''}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
              <button type="button" class="btn btn-warning" id="btnSpeichern">
                <i class="bi bi-check-lg"></i> Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.showModal(modalHtml, async () => {
      const form = document.getElementById('ueberstundenBearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const updateResult = await this.dataManager.db.run(`
        UPDATE ueberstunden 
        SET datum = ?, stunden = ?, notiz = ?
        WHERE id = ?
      `, [
        document.getElementById('datum').value,
        parseFloat(document.getElementById('stunden').value),
        document.getElementById('notiz').value || null,
        eintrag.id
      ]);

      if (!updateResult.success) {
        showNotification('Fehler', updateResult.error, 'danger');
        return false;
      }

      this.dataManager.invalidateCache();
      showNotification('Erfolg', 'Überstunden wurden aktualisiert', 'success');
      if (callback) await callback();
      return true;
    });
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailDialog;
}