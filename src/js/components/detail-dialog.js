/**
 * Detail-Dialog
 * Zeigt alle Einträge eines Mitarbeiters für ein Jahr an
 * Ermöglicht das Bearbeiten und Löschen von Einträgen
 * 
 * LAYOUT: Links Stammdaten + KPIs, Rechts Einträge (sortiert chronologisch)
 */

class DetailDialog extends DialogBase {
  /**
   * Zeigt Detail-Dialog für einen Mitarbeiter
   */
  async zeigeDetails(mitarbeiterId, jahr = null) {
    jahr = jahr || this.dataManager.aktuellesJahr;
    
    // Lade Mitarbeiter und Statistik
    const stat = await this.dataManager.getMitarbeiterStatistik(mitarbeiterId);
    if (!stat) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    const ma = stat.mitarbeiter;

    // Lade alle Einträge für das Jahr
    const eintraege = await this._ladeAlleEintraege(mitarbeiterId, jahr);
    
    // Kombiniere und sortiere alle Einträge chronologisch
    const alleEintraegeSortiert = this._kombiniereUndSortiereEintraege(eintraege);

    const modalHtml = `
      <div class="modal fade" id="detailModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-person-circle"></i> ${ma.vorname} ${ma.nachname} - Details ${jahr}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <!-- LINKE SPALTE: Stammdaten + KPIs -->
                <div class="col-md-4">
                  <!-- Stammdaten Card -->
                  <div class="card bg-dark mb-3">
                    <div class="card-header bg-secondary">
                      <h6 class="mb-0"><i class="bi bi-person-badge"></i> Stammdaten</h6>
                    </div>
                    <div class="card-body">
                      <table class="table table-sm table-borderless mb-0">
                        <tr>
                          <td class="text-muted">ID:</td>
                          <td class="text-end"><code>${ma.id}</code></td>
                        </tr>
                        <tr>
                          <td class="text-muted">Abteilung:</td>
                          <td class="text-end">
                            <span class="abteilung-badge" style="background-color: ${ma.abteilung_farbe}; font-size: 0.85rem;">
                              ${ma.abteilung_name}
                            </span>
                          </td>
                        </tr>
                        ${ma.email ? `
                        <tr>
                          <td class="text-muted">Email:</td>
                          <td class="text-end"><small>${ma.email}</small></td>
                        </tr>
                        ` : ''}
                        ${ma.geburtsdatum ? `
                        <tr>
                          <td class="text-muted">Geburtsdatum:</td>
                          <td class="text-end">${formatDatumAnzeige(ma.geburtsdatum)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td class="text-muted">Eintritt:</td>
                          <td class="text-end">${formatDatumAnzeige(ma.eintrittsdatum)}</td>
                        </tr>
                        ${ma.austrittsdatum ? `
                        <tr>
                          <td class="text-muted">Austritt:</td>
                          <td class="text-end">
                            <span class="badge bg-danger">${formatDatumAnzeige(ma.austrittsdatum)}</span>
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td class="text-muted">Urlaub/Jahr:</td>
                          <td class="text-end fw-bold">${ma.urlaubstage_jahr} Tage</td>
                        </tr>
                      </table>
                    </div>
                  </div>

                  <!-- KPI Cards -->
                  <div class="card bg-dark mb-3">
                    <div class="card-header bg-secondary">
                      <h6 class="mb-0"><i class="bi bi-graph-up"></i> Statistik ${jahr}</h6>
                    </div>
                    <div class="card-body p-2">
                      <!-- Urlaub -->
                      <div class="kpi-item p-2 mb-2 rounded" style="background-color: rgba(40, 167, 69, 0.1); border-left: 3px solid #28a745;">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-calendar-check"></i> Urlaub</small>
                            <span class="fw-bold text-success fs-5">${stat.urlaub_genommen.toFixed(1)}</span>
                            <small class="text-muted"> / ${stat.urlaub_verfuegbar.toFixed(1)}</small>
                          </div>
                          <div class="text-end">
                            <small class="text-muted d-block">Rest</small>
                            <span class="fw-bold ${stat.urlaub_rest < 0 ? 'text-danger' : stat.urlaub_rest < 5 ? 'text-warning' : 'text-success'}">
                              ${stat.urlaub_rest.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Übertrag (klickbar) -->
                      <div class="kpi-item p-2 mb-2 rounded clickable" id="clickUebertrag" 
                           style="background-color: rgba(23, 162, 184, 0.1); border-left: 3px solid #17a2b8; cursor: pointer;"
                           title="Klicken zum Anpassen">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-arrow-down-circle"></i> Übertrag ${jahr - 1}</small>
                            <span class="fw-bold text-info fs-5">${stat.uebertrag_vorjahr.toFixed(1)}</span>
                          </div>
                          <i class="bi bi-pencil-square text-info"></i>
                        </div>
                      </div>

                      <!-- Krankheit -->
                      <div class="kpi-item p-2 mb-2 rounded" style="background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545;">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-bandaid"></i> Krankheit</small>
                            <span class="fw-bold text-danger fs-5">${stat.krankheitstage.toFixed(1)}</span>
                            <small class="text-muted">Tage</small>
                          </div>
                        </div>
                      </div>

                      <!-- Schulung -->
                      <div class="kpi-item p-2 mb-2 rounded" style="background-color: rgba(23, 162, 184, 0.1); border-left: 3px solid #17a2b8;">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-book"></i> Schulung</small>
                            <span class="fw-bold text-info fs-5">${stat.schulungstage.toFixed(1)}</span>
                            <small class="text-muted">Tage</small>
                          </div>
                        </div>
                      </div>

                      <!-- Überstunden -->
                      <div class="kpi-item p-2 rounded" style="background-color: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107;">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-clock"></i> Überstunden</small>
                            <span class="fw-bold text-warning fs-5">${stat.ueberstunden >= 0 ? '+' : ''}${stat.ueberstunden.toFixed(1)}</span>
                            <small class="text-muted">Std.</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Zusammenfassung -->
                  <div class="card bg-dark">
                    <div class="card-body p-3 text-center">
                      <small class="text-muted d-block mb-2">Gesamteinträge ${jahr}</small>
                      <div class="d-flex justify-content-around">
                        <div>
                          <span class="badge bg-success">${eintraege.urlaub.length}</span>
                          <small class="d-block text-muted mt-1">Urlaub</small>
                        </div>
                        <div>
                          <span class="badge bg-danger">${eintraege.krankheit.length}</span>
                          <small class="d-block text-muted mt-1">Krank</small>
                        </div>
                        <div>
                          <span class="badge bg-info">${eintraege.schulung.length}</span>
                          <small class="d-block text-muted mt-1">Schulung</small>
                        </div>
                        <div>
                          <span class="badge bg-warning">${eintraege.ueberstunden.length}</span>
                          <small class="d-block text-muted mt-1">Überst.</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- RECHTE SPALTE: Alle Einträge chronologisch sortiert -->
                <div class="col-md-8">
                  <div class="card bg-dark">
                    <div class="card-header bg-secondary d-flex justify-content-between align-items-center">
                      <h6 class="mb-0"><i class="bi bi-list-ul"></i> Alle Einträge (chronologisch)</h6>
                      <small class="text-muted">${alleEintraegeSortiert.length} Einträge</small>
                    </div>
                    <div class="card-body p-0" style="max-height: 600px; overflow-y: auto;">
                      ${this._renderAlleEintraege(alleEintraegeSortiert)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle"></i> Schließen
              </button>
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

    const modalElement = document.querySelector('#detailModal');
    const modal = new bootstrap.Modal(modalElement);

    // Event-Listener für Löschen-Buttons
    this._initDeleteListeners(modalElement, mitarbeiterId, modal, jahr);

    // Event-Listener für Übertrag-Anpassung
    const clickUebertrag = modalElement.querySelector('#clickUebertrag');
    if (clickUebertrag) {
      clickUebertrag.addEventListener('click', async () => {
        modal.hide();
        // Rufe Dialog Manager auf
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeUebertragAnpassen(mitarbeiterId, async () => {
            // Nach Änderung Detail-Dialog neu laden
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    modal.show();

    modalElement.addEventListener('hidden.bs.modal', () => {
      modal.dispose();
      modalElement.remove();
    });
  }

  /**
   * Lädt alle Einträge für einen Mitarbeiter und Jahr
   */
  async _ladeAlleEintraege(mitarbeiterId, jahr) {
    const jahrStr = jahr.toString();

    // Urlaub
    const urlaubResult = await this.dataManager.db.query(`
      SELECT * FROM urlaub 
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
      ORDER BY von_datum DESC
    `, [mitarbeiterId, jahrStr]);

    // Krankheit
    const krankheitResult = await this.dataManager.db.query(`
      SELECT * FROM krankheit 
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
      ORDER BY von_datum DESC
    `, [mitarbeiterId, jahrStr]);

    // Schulung
    const schulungResult = await this.dataManager.db.query(`
      SELECT * FROM schulung 
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
      ORDER BY datum DESC
    `, [mitarbeiterId, jahrStr]);

    // Überstunden
    const ueberstundenResult = await this.dataManager.db.query(`
      SELECT * FROM ueberstunden 
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
      ORDER BY datum DESC
    `, [mitarbeiterId, jahrStr]);

    return {
      urlaub: urlaubResult.success ? urlaubResult.data : [],
      krankheit: krankheitResult.success ? krankheitResult.data : [],
      schulung: schulungResult.success ? schulungResult.data : [],
      ueberstunden: ueberstundenResult.success ? ueberstundenResult.data : []
    };
  }

  /**
   * Kombiniert alle Einträge und sortiert sie chronologisch (neueste zuerst)
   */
  _kombiniereUndSortiereEintraege(eintraege) {
    const alle = [];

    // Urlaub
    eintraege.urlaub.forEach(e => {
      alle.push({
        typ: 'urlaub',
        datum: e.von_datum,
        datumSort: e.von_datum, // Für Sortierung
        ...e
      });
    });

    // Krankheit
    eintraege.krankheit.forEach(e => {
      alle.push({
        typ: 'krankheit',
        datum: e.von_datum,
        datumSort: e.von_datum,
        ...e
      });
    });

    // Schulung
    eintraege.schulung.forEach(e => {
      alle.push({
        typ: 'schulung',
        datum: e.datum,
        datumSort: e.datum,
        ...e
      });
    });

    // Überstunden
    eintraege.ueberstunden.forEach(e => {
      alle.push({
        typ: 'ueberstunden',
        datum: e.datum,
        datumSort: e.datum,
        ...e
      });
    });

    // Sortiere nach Datum (neueste zuerst)
    alle.sort((a, b) => {
      return new Date(b.datumSort) - new Date(a.datumSort);
    });

    return alle;
  }

  /**
   * Rendert alle Einträge in einer Timeline
   */
  _renderAlleEintraege(eintraege) {
    if (eintraege.length === 0) {
      return `
        <div class="text-center text-muted py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          <p>Keine Einträge für dieses Jahr vorhanden</p>
        </div>
      `;
    }

    return `
      <div class="list-group list-group-flush">
        ${eintraege.map(e => this._renderEintrag(e)).join('')}
      </div>
    `;
  }

  /**
   * Rendert einen einzelnen Eintrag
   */
  _renderEintrag(eintrag) {
    const config = this._getEintragConfig(eintrag.typ);
    
    let hauptInfo = '';
    let nebenInfo = '';

    switch (eintrag.typ) {
      case 'urlaub':
        hauptInfo = `${formatDatumAnzeige(eintrag.von_datum)} - ${formatDatumAnzeige(eintrag.bis_datum)}`;
        nebenInfo = `<strong>${eintrag.tage.toFixed(1)}</strong> Tage`;
        break;
      case 'krankheit':
        hauptInfo = `${formatDatumAnzeige(eintrag.von_datum)} - ${formatDatumAnzeige(eintrag.bis_datum)}`;
        nebenInfo = `<strong>${eintrag.tage.toFixed(1)}</strong> Tage`;
        break;
      case 'schulung':
        hauptInfo = formatDatumAnzeige(eintrag.datum);
        nebenInfo = `<strong>${eintrag.dauer_tage.toFixed(1)}</strong> Tage`;
        break;
      case 'ueberstunden':
        hauptInfo = formatDatumAnzeige(eintrag.datum);
        const vorzeichen = eintrag.stunden >= 0 ? '+' : '';
        nebenInfo = `<strong>${vorzeichen}${eintrag.stunden.toFixed(1)}</strong> Std.`;
        break;
    }

    return `
      <div class="list-group-item list-group-item-action bg-dark border-secondary">
        <div class="d-flex w-100 justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <span class="badge ${config.badgeClass} me-2">
                <i class="${config.icon}"></i> ${config.label}
              </span>
              <span class="text-light">${hauptInfo}</span>
            </div>
            <div class="d-flex align-items-center">
              <span class="${config.textClass} me-3">${nebenInfo}</span>
              ${eintrag.titel ? `<span class="text-info"><i class="bi bi-tag"></i> ${eintrag.titel}</span>` : ''}
            </div>
            ${eintrag.notiz ? `
              <small class="text-muted d-block mt-1">
                <i class="bi bi-sticky"></i> ${eintrag.notiz}
              </small>
            ` : ''}
          </div>
          <button class="btn btn-sm btn-outline-danger btn-delete ms-2" 
                  data-id="${eintrag.id}" 
                  data-typ="${eintrag.typ}" 
                  title="Löschen">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Gibt Konfiguration für einen Eintragstyp zurück
   */
  _getEintragConfig(typ) {
    const configs = {
      urlaub: {
        label: 'Urlaub',
        icon: 'bi bi-calendar-check',
        badgeClass: 'bg-success',
        textClass: 'text-success'
      },
      krankheit: {
        label: 'Krankheit',
        icon: 'bi bi-bandaid',
        badgeClass: 'bg-danger',
        textClass: 'text-danger'
      },
      schulung: {
        label: 'Schulung',
        icon: 'bi bi-book',
        badgeClass: 'bg-info',
        textClass: 'text-info'
      },
      ueberstunden: {
        label: 'Überstunden',
        icon: 'bi bi-clock',
        badgeClass: 'bg-warning text-dark',
        textClass: 'text-warning'
      }
    };
    return configs[typ] || configs.urlaub;
  }

  /**
   * Initialisiert Event-Listener für Löschen-Buttons
   */
  _initDeleteListeners(modalElement, mitarbeiterId, modal, jahr) {
    modalElement.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      if (!deleteBtn) return;

      const id = parseInt(deleteBtn.dataset.id);
      const typ = deleteBtn.dataset.typ;

      if (!confirm(`Möchten Sie diesen ${this._getTypLabel(typ)}-Eintrag wirklich löschen?`)) {
        return;
      }

      try {
        // Bestimme Tabellennamen
        const tabelle = typ === 'ueberstunden' ? 'ueberstunden' : typ;
        
        const result = await this.dataManager.db.run(
          `DELETE FROM ${tabelle} WHERE id = ?`,
          [id]
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        showNotification('Erfolg', 'Eintrag wurde gelöscht', 'success');
        
        // Cache invalidieren
        this.dataManager.invalidateCache();
        
        // Dialog neu laden
        modal.hide();
        setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showNotification('Fehler', error.message, 'danger');
      }
    });
  }

  /**
   * Gibt Typ-Label zurück
   */
  _getTypLabel(typ) {
    const labels = {
      urlaub: 'Urlaubs',
      krankheit: 'Krankheits',
      schulung: 'Schulungs',
      ueberstunden: 'Überstunden'
    };
    return labels[typ] || typ;
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailDialog;
}