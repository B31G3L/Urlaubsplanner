/**
 * Detail-Dialog
 * Zeigt alle Einträge eines Mitarbeiters für ein Jahr an
 * Ermöglicht das Bearbeiten und Löschen von Einträgen
 * 
 * LAYOUT: Links Stammdaten + KPIs, Rechts Einträge (sortiert chronologisch)
 * NEU: Bearbeiten-Button für alle Einträge hinzugefügt
 */

class DetailDialog extends DialogBase {
  /**
   * Zeigt Detail-Dialog für einen Mitarbeiter
   * Gibt ein Promise zurück das erst resolved wird wenn der Dialog geschlossen wurde
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

    // Berechne tatsächlich gemachte Überstunden (nur positive Werte)
    const ueberstundenGemacht = await this._berechneUeberstundenGemacht(mitarbeiterId, jahr);


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
              <!-- Button-Leiste -->
              <div class="d-flex gap-2 mb-3 pb-3 border-bottom">
                <button class="btn btn-outline-primary" id="btnMitarbeiterBearbeiten">
                  <i class="bi bi-pencil"></i> Mitarbeiter bearbeiten
                </button>
                <div class="btn-group ms-auto">
                  <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-download"></i> Export
                  </button>
                  <ul class="dropdown-menu">
                    <li>
                      <a class="dropdown-item" href="#" id="btnExportExcel">
                        <i class="bi bi-file-earmark-excel text-success"></i> Als Excel exportieren
                      </a>
                    </li>
                    <li>
                      <a class="dropdown-item" href="#" id="btnExportPDF">
                        <i class="bi bi-file-earmark-pdf text-danger"></i> Als PDF exportieren
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              
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
                        <tr>
                          <td class="text-muted">Überstunden ${jahr}:</td>
                          <td class="text-end fw-bold text-success">
                            +${ueberstundenGemacht.toFixed(1)} Std.
                          </td>
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
                      <!-- Urlaub (klickbar) -->
                      <div class="kpi-item p-2 mb-2 rounded clickable" id="clickUrlaub" 
                           style="background-color: rgba(40, 167, 69, 0.1); border-left: 3px solid #28a745; cursor: pointer;"
                           title="Klicken um Urlaub einzutragen">
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

                      <!-- Krankheit (klickbar) -->
                      <div class="kpi-item p-2 mb-2 rounded clickable" id="clickKrankheit" 
                           style="background-color: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; cursor: pointer;"
                           title="Klicken um Krankheit einzutragen">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-bandaid"></i> Krankheit</small>
                            <span class="fw-bold text-danger fs-5">${stat.krankheitstage.toFixed(1)}</span>
                            <small class="text-muted">Tage</small>
                          </div>
                          <i class="bi bi-plus-circle text-danger"></i>
                        </div>
                      </div>

                      <!-- Schulung (klickbar) -->
                      <div class="kpi-item p-2 mb-2 rounded clickable" id="clickSchulung" 
                           style="background-color: rgba(23, 162, 184, 0.1); border-left: 3px solid #17a2b8; cursor: pointer;"
                           title="Klicken um Schulung einzutragen">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-book"></i> Schulung</small>
                            <span class="fw-bold text-info fs-5">${stat.schulungstage.toFixed(1)}</span>
                            <small class="text-muted">Tage</small>
                          </div>
                          <i class="bi bi-plus-circle text-info"></i>
                        </div>
                      </div>

                      <!-- Überstunden (klickbar) -->
                      <div class="kpi-item p-2 rounded clickable" id="clickUeberstunden" 
                           style="background-color: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107; cursor: pointer;"
                           title="Klicken um Überstunden einzutragen">
                        <div class="d-flex justify-content-between align-items-center">
                          <div>
                            <small class="text-muted d-block"><i class="bi bi-clock"></i> Überstunden</small>
                            <span class="fw-bold text-warning fs-5">${stat.ueberstunden >= 0 ? '+' : ''}${stat.ueberstunden.toFixed(1)}</span>
                            <small class="text-muted">Std.</small>
                          </div>
                          <i class="bi bi-plus-circle text-warning"></i>
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

    // Event-Listener für Löschen- und Bearbeiten-Buttons
    this._initActionListeners(modalElement, mitarbeiterId, modal, jahr);

    // Event-Listener für Urlaub eintragen
    const clickUrlaub = modalElement.querySelector('#clickUrlaub');
    if (clickUrlaub) {
      clickUrlaub.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeUrlaubDialog(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Event-Listener für Übertrag-Anpassung
    const clickUebertrag = modalElement.querySelector('#clickUebertrag');
    if (clickUebertrag) {
      clickUebertrag.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeUebertragAnpassen(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Event-Listener für Krankheit eintragen
    const clickKrankheit = modalElement.querySelector('#clickKrankheit');
    if (clickKrankheit) {
      clickKrankheit.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeKrankDialog(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Event-Listener für Schulung eintragen
    const clickSchulung = modalElement.querySelector('#clickSchulung');
    if (clickSchulung) {
      clickSchulung.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeSchulungDialog(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Event-Listener für Überstunden eintragen
    const clickUeberstunden = modalElement.querySelector('#clickUeberstunden');
    if (clickUeberstunden) {
      clickUeberstunden.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeUeberstundenDialog(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Event-Listener für Bearbeiten-Button
    const btnBearbeiten = modalElement.querySelector('#btnMitarbeiterBearbeiten');
    if (btnBearbeiten) {
      btnBearbeiten.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeStammdatenBearbeiten(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Event-Listener für Excel-Export
    const btnExportExcel = modalElement.querySelector('#btnExportExcel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this._exportExcel(stat, alleEintraegeSortiert, jahr);
      });
    }

    // Event-Listener für PDF-Export
    const btnExportPDF = modalElement.querySelector('#btnExportPDF');
    if (btnExportPDF) {
      btnExportPDF.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this._exportPDF(stat, alleEintraegeSortiert, jahr);
      });
    }

    modal.show();

    // Promise erstellen das erst resolved wird wenn Modal geschlossen wurde
    return new Promise((resolve) => {
      modalElement.addEventListener('hidden.bs.modal', () => {
        modal.dispose();
        modalElement.remove();
        resolve();
      }, { once: true });
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
   * Berechnet die tatsächlich gemachten Überstunden (nur positive Werte)
   */
  async _berechneUeberstundenGemacht(mitarbeiterId, jahr) {
    const jahrStr = jahr.toString();
    
    const result = await this.dataManager.db.query(`
      SELECT stunden FROM ueberstunden 
      WHERE mitarbeiter_id = ? 
        AND strftime('%Y', datum) = ?
        AND stunden > 0
    `, [mitarbeiterId, jahrStr]);
    
    if (!result.success || !result.data) return 0;
    
    return result.data.reduce((sum, row) => sum + row.stunden, 0);
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
        datumSort: e.von_datum,
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
          <div class="btn-group btn-group-sm ms-2">
            <button class="btn btn-outline-primary btn-edit" 
                    data-id="${eintrag.id}" 
                    data-typ="${eintrag.typ}" 
                    title="Bearbeiten">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-delete" 
                    data-id="${eintrag.id}" 
                    data-typ="${eintrag.typ}" 
                    title="Löschen">
              <i class="bi bi-trash"></i>
            </button>
          </div>
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
   * Initialisiert Event-Listener für Löschen- und Bearbeiten-Buttons
   */
  _initActionListeners(modalElement, mitarbeiterId, modal, jahr) {
    modalElement.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      const editBtn = e.target.closest('.btn-edit');
      
      if (deleteBtn) {
        await this._handleDelete(deleteBtn, mitarbeiterId, modal, jahr);
      } else if (editBtn) {
        await this._handleEdit(editBtn, mitarbeiterId, modal, jahr);
      }
    });
  }

  /**
   * Behandelt Löschen-Aktion
   */
  async _handleDelete(deleteBtn, mitarbeiterId, modal, jahr) {
    const id = parseInt(deleteBtn.dataset.id);
    const typ = deleteBtn.dataset.typ;

    if (!confirm(`Möchten Sie diesen ${this._getTypLabel(typ)}-Eintrag wirklich löschen?`)) {
      return;
    }

    try {
      const tabelle = typ === 'ueberstunden' ? 'ueberstunden' : typ;
      
      const result = await this.dataManager.db.run(
        `DELETE FROM ${tabelle} WHERE id = ?`,
        [id]
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      showNotification('Erfolg', 'Eintrag wurde gelöscht', 'success');
      
      this.dataManager.invalidateCache();
      
      modal.hide();
      setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      showNotification('Fehler', error.message, 'danger');
    }
  }

  /**
   * Behandelt Bearbeiten-Aktion
   */
  async _handleEdit(editBtn, mitarbeiterId, modal, jahr) {
    const id = parseInt(editBtn.dataset.id);
    const typ = editBtn.dataset.typ;

    modal.hide();

    // Lade den Eintrag
    const eintrag = await this._ladeEintrag(id, typ);
    if (!eintrag) {
      showNotification('Fehler', 'Eintrag nicht gefunden', 'danger');
      return;
    }

    // Zeige entsprechenden Bearbeiten-Dialog
    switch (typ) {
      case 'urlaub':
        await this._zeigeUrlaubBearbeiten(eintrag, mitarbeiterId, jahr);
        break;
      case 'krankheit':
        await this._zeigeKrankheitBearbeiten(eintrag, mitarbeiterId, jahr);
        break;
      case 'schulung':
        await this._zeigeSchulungBearbeiten(eintrag, mitarbeiterId, jahr);
        break;
      case 'ueberstunden':
        await this._zeigeUeberstundenBearbeiten(eintrag, mitarbeiterId, jahr);
        break;
    }
  }

  /**
   * Lädt einen einzelnen Eintrag
   */
  async _ladeEintrag(id, typ) {
    const tabelle = typ === 'ueberstunden' ? 'ueberstunden' : typ;
    const result = await this.dataManager.db.get(
      `SELECT * FROM ${tabelle} WHERE id = ?`,
      [id]
    );
    return result.success ? result.data : null;
  }

  /**
   * Zeigt Urlaub-Bearbeiten Dialog
   */
  async _zeigeUrlaubBearbeiten(eintrag, mitarbeiterId, jahr) {
    const stat = await this.dataManager.getMitarbeiterStatistik(mitarbeiterId);
    const restUrlaub = stat ? stat.urlaub_rest : 0;
    const maxUrlaub = restUrlaub + eintrag.tage; // Aktueller Rest + die Tage dieses Eintrags

    const modalHtml = `
      <div class="modal fade" id="bearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">
                <i class="bi bi-pencil"></i> Urlaub bearbeiten
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-info mb-3">
                <strong>Verfügbarer Urlaub (inkl. diesem Eintrag):</strong> ${maxUrlaub.toFixed(1)} Tage
              </div>
              <form id="bearbeitenForm">
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
                  <label class="form-label">Urlaubstage: <span id="dauerAnzeige" class="fw-bold">${eintrag.tage.toFixed(1)}</span></label>
                </div>
                <div class="mb-3">
                  <label class="form-label">Notizen</label>
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
      const form = document.getElementById('bearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const vonDatum = document.getElementById('vonDatum').value;
      const bisDatum = document.getElementById('bisDatum').value;
      const dauerAnzeige = document.getElementById('dauerAnzeige').textContent;
      const tage = parseFloat(dauerAnzeige);
      const notiz = document.getElementById('notiz').value || null;

      if (tage > maxUrlaub) {
        showNotification('Fehler', `Nicht genügend Urlaub! Verfügbar: ${maxUrlaub.toFixed(1)} Tage`, 'danger');
        return false;
      }

      try {
        const result = await this.dataManager.db.run(`
          UPDATE urlaub 
          SET von_datum = ?, bis_datum = ?, tage = ?, notiz = ?
          WHERE id = ?
        `, [vonDatum, bisDatum, tage, notiz, eintrag.id]);

        if (!result.success) {
          throw new Error(result.error);
        }

        showNotification('Erfolg', 'Urlaub wurde aktualisiert', 'success');
        this.dataManager.invalidateCache();
        setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });

    // Berechnung für Dauer
    setTimeout(async () => {
      const vonInput = document.getElementById('vonDatum');
      const bisInput = document.getElementById('bisDatum');
      const dauerAnzeige = document.getElementById('dauerAnzeige');

      const berechne = async () => {
        if (vonInput.value && bisInput.value) {
          const tage = await berechneArbeitstageAsync(vonInput.value, bisInput.value);
          dauerAnzeige.textContent = tage.toFixed(1);
        }
      };

      vonInput.addEventListener('change', berechne);
      bisInput.addEventListener('change', berechne);
    }, 100);
  }

  /**
   * Zeigt Krankheit-Bearbeiten Dialog
   */
  async _zeigeKrankheitBearbeiten(eintrag, mitarbeiterId, jahr) {
    const modalHtml = `
      <div class="modal fade" id="bearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">
                <i class="bi bi-pencil"></i> Krankheit bearbeiten
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="bearbeitenForm">
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
                  <label class="form-label">Krankheitstage: <span id="dauerAnzeige" class="fw-bold">${eintrag.tage.toFixed(1)}</span></label>
                </div>
                <div class="mb-3">
                  <label class="form-label">Notizen</label>
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
      const form = document.getElementById('bearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const vonDatum = document.getElementById('vonDatum').value;
      const bisDatum = document.getElementById('bisDatum').value;
      const dauerAnzeige = document.getElementById('dauerAnzeige').textContent;
      const tage = parseFloat(dauerAnzeige);
      const notiz = document.getElementById('notiz').value || null;

      try {
        const result = await this.dataManager.db.run(`
          UPDATE krankheit 
          SET von_datum = ?, bis_datum = ?, tage = ?, notiz = ?
          WHERE id = ?
        `, [vonDatum, bisDatum, tage, notiz, eintrag.id]);

        if (!result.success) {
          throw new Error(result.error);
        }

        showNotification('Erfolg', 'Krankheit wurde aktualisiert', 'success');
        this.dataManager.invalidateCache();
        setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });

    // Berechnung
    setTimeout(async () => {
      const vonInput = document.getElementById('vonDatum');
      const bisInput = document.getElementById('bisDatum');
      const dauerAnzeige = document.getElementById('dauerAnzeige');

      const berechne = async () => {
        if (vonInput.value && bisInput.value) {
          const tage = await berechneArbeitstageAsync(vonInput.value, bisInput.value);
          dauerAnzeige.textContent = tage.toFixed(1);
        }
      };

      vonInput.addEventListener('change', berechne);
      bisInput.addEventListener('change', berechne);
    }, 100);
  }

  /**
   * Zeigt Schulung-Bearbeiten Dialog
   */
  async _zeigeSchulungBearbeiten(eintrag, mitarbeiterId, jahr) {
    // Berechne bis_datum aus datum + dauer_tage
    const vonDate = new Date(eintrag.datum);
    const bisDate = new Date(vonDate);
    bisDate.setDate(bisDate.getDate() + Math.ceil(eintrag.dauer_tage) - 1);
    const bisDatum = bisDate.toISOString().split('T')[0];

    const modalHtml = `
      <div class="modal fade" id="bearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title">
                <i class="bi bi-pencil"></i> Schulung bearbeiten
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="bearbeitenForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Von *</label>
                    <input type="date" class="form-control" id="vonDatum" value="${eintrag.datum}" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Bis *</label>
                    <input type="date" class="form-control" id="bisDatum" value="${bisDatum}" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Schulungstage: <span id="dauerAnzeige" class="fw-bold">${eintrag.dauer_tage.toFixed(1)}</span></label>
                </div>
                <div class="mb-3">
                  <label class="form-label">Titel</label>
                  <input type="text" class="form-control" id="titel" value="${eintrag.titel || ''}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Notizen</label>
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
      const form = document.getElementById('bearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const vonDatum = document.getElementById('vonDatum').value;
      const dauerAnzeige = document.getElementById('dauerAnzeige').textContent;
      const tage = parseFloat(dauerAnzeige);
      const titel = document.getElementById('titel').value || null;
      const notiz = document.getElementById('notiz').value || null;

      try {
        const result = await this.dataManager.db.run(`
          UPDATE schulung 
          SET datum = ?, dauer_tage = ?, titel = ?, notiz = ?
          WHERE id = ?
        `, [vonDatum, tage, titel, notiz, eintrag.id]);

        if (!result.success) {
          throw new Error(result.error);
        }

        showNotification('Erfolg', 'Schulung wurde aktualisiert', 'success');
        this.dataManager.invalidateCache();
        setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });

    // Berechnung
    setTimeout(async () => {
      const vonInput = document.getElementById('vonDatum');
      const bisInput = document.getElementById('bisDatum');
      const dauerAnzeige = document.getElementById('dauerAnzeige');

      const berechne = async () => {
        if (vonInput.value && bisInput.value) {
          const tage = await berechneArbeitstageAsync(vonInput.value, bisInput.value);
          dauerAnzeige.textContent = tage.toFixed(1);
        }
      };

      vonInput.addEventListener('change', berechne);
      bisInput.addEventListener('change', berechne);
    }, 100);
  }

  /**
   * Zeigt Überstunden-Bearbeiten Dialog
   */
  async _zeigeUeberstundenBearbeiten(eintrag, mitarbeiterId, jahr) {
    const modalHtml = `
      <div class="modal fade" id="bearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title">
                <i class="bi bi-pencil"></i> Überstunden bearbeiten
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="bearbeitenForm">
                <div class="mb-3">
                  <label class="form-label">Datum *</label>
                  <input type="date" class="form-control" id="datum" value="${eintrag.datum}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Stunden *</label>
                  <input type="number" class="form-control" id="stunden" value="${eintrag.stunden}" 
                         min="-100" max="100" step="0.25" required>
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
      const form = document.getElementById('bearbeitenForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const datum = document.getElementById('datum').value;
      const stunden = parseFloat(document.getElementById('stunden').value);
      const notiz = document.getElementById('notiz').value || null;

      try {
        const result = await this.dataManager.db.run(`
          UPDATE ueberstunden 
          SET datum = ?, stunden = ?, notiz = ?
          WHERE id = ?
        `, [datum, stunden, notiz, eintrag.id]);

        if (!result.success) {
          throw new Error(result.error);
        }

        showNotification('Erfolg', 'Überstunden wurden aktualisiert', 'success');
        this.dataManager.invalidateCache();
        setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
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

  /**
   * Exportiert Mitarbeiter-Details als Excel (CSV)
   */
  async _exportExcel(stat, eintraege, jahr) {
    try {
      const ma = stat.mitarbeiter;
      const BOM = '\uFEFF';
      
      // Header mit Mitarbeiter-Info
      let csv = BOM;
      csv += `Mitarbeiter-Detailbericht;${jahr}\n`;
      csv += `Name;${ma.vorname} ${ma.nachname}\n`;
      csv += `Abteilung;${ma.abteilung_name}\n`;
      csv += `\n`;
      
      // Statistik
      csv += `Statistik ${jahr}\n`;
      csv += `Urlaubsanspruch;${ma.urlaubstage_jahr} Tage\n`;
      csv += `Übertrag Vorjahr;${stat.uebertrag_vorjahr.toFixed(1)} Tage\n`;
      csv += `Verfügbar;${stat.urlaub_verfuegbar.toFixed(1)} Tage\n`;
      csv += `Genommen;${stat.urlaub_genommen.toFixed(1)} Tage\n`;
      csv += `Rest;${stat.urlaub_rest.toFixed(1)} Tage\n`;
      csv += `Krankheitstage;${stat.krankheitstage.toFixed(1)} Tage\n`;
      csv += `Schulungstage;${stat.schulungstage.toFixed(1)} Tage\n`;
      csv += `Überstunden;${stat.ueberstunden >= 0 ? '+' : ''}${stat.ueberstunden.toFixed(1)} Std.\n`;
      csv += `\n`;
      
      // Einträge nach Typ gruppiert
      const gruppiertNachTyp = this._gruppiereEintraegeNachTyp(eintraege);
      
      if (gruppiertNachTyp.urlaub.length > 0) {
        csv += `Urlaub\n`;
        csv += `Von;Bis;Tage;Notiz\n`;
        gruppiertNachTyp.urlaub.forEach(e => {
          csv += `${formatDatumAnzeige(e.von_datum)};${formatDatumAnzeige(e.bis_datum)};${e.tage.toFixed(1)};${e.notiz || ''}\n`;
        });
        csv += `\n`;
      }
      
      if (gruppiertNachTyp.krankheit.length > 0) {
        csv += `Krankheit\n`;
        csv += `Von;Bis;Tage;Notiz\n`;
        gruppiertNachTyp.krankheit.forEach(e => {
          csv += `${formatDatumAnzeige(e.von_datum)};${formatDatumAnzeige(e.bis_datum)};${e.tage.toFixed(1)};${e.notiz || ''}\n`;
        });
        csv += `\n`;
      }
      
      if (gruppiertNachTyp.schulung.length > 0) {
        csv += `Schulung\n`;
        csv += `Datum;Dauer;Titel;Notiz\n`;
        gruppiertNachTyp.schulung.forEach(e => {
          csv += `${formatDatumAnzeige(e.datum)};${e.dauer_tage.toFixed(1)} Tage;${e.titel || ''};${e.notiz || ''}\n`;
        });
        csv += `\n`;
      }
      
      if (gruppiertNachTyp.ueberstunden.length > 0) {
        csv += `Überstunden\n`;
        csv += `Datum;Stunden;Notiz\n`;
        gruppiertNachTyp.ueberstunden.forEach(e => {
          const vorzeichen = e.stunden >= 0 ? '+' : '';
          csv += `${formatDatumAnzeige(e.datum)};${vorzeichen}${e.stunden.toFixed(1)};${e.notiz || ''}\n`;
        });
      }

      // Datei speichern
      if (window.electronAPI) {
        const result = await window.electronAPI.showSaveDialog({
          title: 'Excel Exportieren',
          defaultPath: `${ma.nachname}_${ma.vorname}_${jahr}.csv`,
          filters: [
            { name: 'CSV Dateien', extensions: ['csv'] },
            { name: 'Alle Dateien', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          await window.electronAPI.writeFile(result.filePath, csv);
          showNotification('Export erfolgreich', 'Daten wurden als Excel exportiert', 'success');
        }
      } else {
        // Fallback für Browser
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${ma.nachname}_${ma.vorname}_${jahr}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        showNotification('Export erfolgreich', 'CSV wurde heruntergeladen', 'success');
      }
    } catch (error) {
      console.error('Fehler beim Excel-Export:', error);
      showNotification('Export fehlgeschlagen', error.message, 'danger');
    }
  }

  /**
   * Exportiert Mitarbeiter-Details als PDF
   */
  async _exportPDF(stat, eintraege, jahr) {
    try {
      const ma = stat.mitarbeiter;
      
      // HTML für PDF erstellen
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${ma.vorname} ${ma.nachname} - ${jahr}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f538d; border-bottom: 2px solid #1f538d; padding-bottom: 10px; }
            h2 { color: #495057; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; }
            .stats { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .stats-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; }
            .badge-success { background-color: #28a745; color: white; }
            .badge-danger { background-color: #dc3545; color: white; }
            .badge-info { background-color: #17a2b8; color: white; }
            .badge-warning { background-color: #ffc107; color: black; }
          </style>
        </head>
        <body>
          <h1>Mitarbeiter-Detailbericht ${jahr}</h1>
          
          <div class="stats">
            <h2>Stammdaten</h2>
            <div class="stats-row"><strong>Name:</strong> ${ma.vorname} ${ma.nachname}</div>
            <div class="stats-row"><strong>Abteilung:</strong> ${ma.abteilung_name}</div>
            ${ma.email ? `<div class="stats-row"><strong>Email:</strong> ${ma.email}</div>` : ''}
            <div class="stats-row"><strong>Eintritt:</strong> ${formatDatumAnzeige(ma.eintrittsdatum)}</div>
            ${ma.austrittsdatum ? `<div class="stats-row"><strong>Austritt:</strong> ${formatDatumAnzeige(ma.austrittsdatum)}</div>` : ''}
          </div>
          
          <div class="stats">
            <h2>Statistik ${jahr}</h2>
            <div class="stats-row"><strong>Urlaubsanspruch:</strong> ${ma.urlaubstage_jahr} Tage</div>
            <div class="stats-row"><strong>Übertrag Vorjahr:</strong> ${stat.uebertrag_vorjahr.toFixed(1)} Tage</div>
            <div class="stats-row"><strong>Verfügbar:</strong> ${stat.urlaub_verfuegbar.toFixed(1)} Tage</div>
            <div class="stats-row"><strong>Genommen:</strong> ${stat.urlaub_genommen.toFixed(1)} Tage</div>
            <div class="stats-row"><strong>Rest:</strong> <span class="${stat.urlaub_rest < 0 ? 'badge badge-danger' : 'badge badge-success'}">${stat.urlaub_rest.toFixed(1)} Tage</span></div>
            <div class="stats-row"><strong>Krankheitstage:</strong> ${stat.krankheitstage.toFixed(1)} Tage</div>
            <div class="stats-row"><strong>Schulungstage:</strong> ${stat.schulungstage.toFixed(1)} Tage</div>
            <div class="stats-row"><strong>Überstunden:</strong> ${stat.ueberstunden >= 0 ? '+' : ''}${stat.ueberstunden.toFixed(1)} Std.</div>
          </div>
      `;
      
      // Einträge nach Typ gruppiert
      const gruppiertNachTyp = this._gruppiereEintraegeNachTyp(eintraege);
      
      if (gruppiertNachTyp.urlaub.length > 0) {
        html += `
          <h2>Urlaub (${gruppiertNachTyp.urlaub.length} Einträge)</h2>
          <table>
            <tr><th>Von</th><th>Bis</th><th>Tage</th><th>Notiz</th></tr>
        `;
        gruppiertNachTyp.urlaub.forEach(e => {
          html += `<tr>
            <td>${formatDatumAnzeige(e.von_datum)}</td>
            <td>${formatDatumAnzeige(e.bis_datum)}</td>
            <td>${e.tage.toFixed(1)}</td>
            <td>${e.notiz || '-'}</td>
          </tr>`;
        });
        html += `</table>`;
      }
      
      if (gruppiertNachTyp.krankheit.length > 0) {
        html += `
          <h2>Krankheit (${gruppiertNachTyp.krankheit.length} Einträge)</h2>
          <table>
            <tr><th>Von</th><th>Bis</th><th>Tage</th><th>Notiz</th></tr>
        `;
        gruppiertNachTyp.krankheit.forEach(e => {
          html += `<tr>
            <td>${formatDatumAnzeige(e.von_datum)}</td>
            <td>${formatDatumAnzeige(e.bis_datum)}</td>
            <td>${e.tage.toFixed(1)}</td>
            <td>${e.notiz || '-'}</td>
          </tr>`;
        });
        html += `</table>`;
      }
      
      if (gruppiertNachTyp.schulung.length > 0) {
        html += `
          <h2>Schulung (${gruppiertNachTyp.schulung.length} Einträge)</h2>
          <table>
            <tr><th>Datum</th><th>Dauer</th><th>Titel</th><th>Notiz</th></tr>
        `;
        gruppiertNachTyp.schulung.forEach(e => {
          html += `<tr>
            <td>${formatDatumAnzeige(e.datum)}</td>
            <td>${e.dauer_tage.toFixed(1)} Tage</td>
            <td>${e.titel || '-'}</td>
            <td>${e.notiz || '-'}</td>
          </tr>`;
        });
        html += `</table>`;
      }
      
      if (gruppiertNachTyp.ueberstunden.length > 0) {
        html += `
          <h2>Überstunden (${gruppiertNachTyp.ueberstunden.length} Einträge)</h2>
          <table>
            <tr><th>Datum</th><th>Stunden</th><th>Notiz</th></tr>
        `;
        gruppiertNachTyp.ueberstunden.forEach(e => {
          const vorzeichen = e.stunden >= 0 ? '+' : '';
          html += `<tr>
            <td>${formatDatumAnzeige(e.datum)}</td>
            <td>${vorzeichen}${e.stunden.toFixed(1)}</td>
            <td>${e.notiz || '-'}</td>
          </tr>`;
        });
        html += `</table>`;
      }
      
      html += `
          <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; color: #666;">
            <small>Erstellt am ${new Date().toLocaleDateString('de-DE')} - Teamplanner</small>
          </div>
        </body>
        </html>
      `;

      // PDF erstellen durch Drucken-Dialog
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Warte kurz und öffne dann Druck-Dialog
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      showNotification('PDF-Export', 'Druckdialog wurde geöffnet', 'info');
      
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      showNotification('Export fehlgeschlagen', error.message, 'danger');
    }
  }

  /**
   * Gruppiert Einträge nach Typ
   */
  _gruppiereEintraegeNachTyp(eintraege) {
    const gruppiert = {
      urlaub: [],
      krankheit: [],
      schulung: [],
      ueberstunden: []
    };
    
    eintraege.forEach(e => {
      if (gruppiert[e.typ]) {
        gruppiert[e.typ].push(e);
      }
    });
    
    return gruppiert;
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailDialog;
}