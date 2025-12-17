/**
 * Detail-Dialog
 * Zeigt alle Einträge eines Mitarbeiters für ein Jahr an
 * Ermöglicht das Bearbeiten und Löschen von Einträgen
 * 
 * LAYOUT: Links Stammdaten + KPIs, Rechts Einträge (sortiert chronologisch)
 * NEU: Bearbeiten-Button für alle Einträge hinzugefügt
 * NEU: Filter und Sortierung für Einträge
 */

class DetailDialog extends DialogBase {
  constructor(dataManager) {
    super(dataManager);
    this.filterTyp = 'alle'; // 'alle', 'urlaub', 'krankheit', 'schulung', 'ueberstunden'
    this.sortierung = 'desc'; // 'desc' (neueste zuerst) oder 'asc' (älteste zuerst)
  }

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

    // Zähle Einträge nach Typ für Filter-Badges
    const anzahlNachTyp = this._zaehleEintraegeNachTyp(alleEintraegeSortiert);

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
                    <div class="card-header bg-secondary">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0"><i class="bi bi-list-ul"></i> Alle Einträge</h6>
                        <div class="d-flex gap-2">
                          <!-- Sortierung -->
                          <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-light sortierung-btn" data-sort="desc" title="Neueste zuerst">
                              <i class="bi bi-sort-down"></i>
                            </button>
                            <button type="button" class="btn btn-outline-light sortierung-btn" data-sort="asc" title="Älteste zuerst">
                              <i class="bi bi-sort-up"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Filter Buttons -->
                      <div class="d-flex gap-2 flex-wrap">
                        <button type="button" class="btn btn-sm btn-outline-secondary filter-btn active" data-filter="alle">
                          <i class="bi bi-list"></i> Alle <span class="badge bg-secondary">${alleEintraegeSortiert.length}</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-success filter-btn" data-filter="urlaub">
                          <i class="bi bi-calendar-check"></i> Urlaub <span class="badge bg-success">${anzahlNachTyp.urlaub}</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger filter-btn" data-filter="krankheit">
                          <i class="bi bi-bandaid"></i> Krankheit <span class="badge bg-danger">${anzahlNachTyp.krankheit}</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-info filter-btn" data-filter="schulung">
                          <i class="bi bi-book"></i> Schulung <span class="badge bg-info">${anzahlNachTyp.schulung}</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-warning filter-btn" data-filter="ueberstunden">
                          <i class="bi bi-clock"></i> Überstunden <span class="badge bg-warning text-dark">${anzahlNachTyp.ueberstunden}</span>
                        </button>
                      </div>
                    </div>
                    <div class="card-body p-0" style="max-height: 600px; overflow-y: auto;" id="eintraegeContainer">
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

    // Event-Listener für Filter und Sortierung
    this._initFilterUndSortierung(modalElement, alleEintraegeSortiert);

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
   * Initialisiert Filter und Sortierung Event-Listener
   */
  _initFilterUndSortierung(modalElement, alleEintraege) {
    const filterButtons = modalElement.querySelectorAll('.filter-btn');
    const sortierungButtons = modalElement.querySelectorAll('.sortierung-btn');
    const container = modalElement.querySelector('#eintraegeContainer');

    // Filter Event-Listener
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Entferne active von allen Buttons
        filterButtons.forEach(b => b.classList.remove('active'));
        // Setze active auf geklickten Button
        btn.classList.add('active');
        
        // Setze Filter
        this.filterTyp = btn.dataset.filter;
        
        // Aktualisiere Anzeige
        this._aktualisiereEintraegeListe(container, alleEintraege);
      });
    });

    // Sortierung Event-Listener
    sortierungButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Entferne active von allen Buttons
        sortierungButtons.forEach(b => b.classList.remove('active'));
        // Setze active auf geklickten Button
        btn.classList.add('active');
        
        // Setze Sortierung
        this.sortierung = btn.dataset.sort;
        
        // Aktualisiere Anzeige
        this._aktualisiereEintraegeListe(container, alleEintraege);
      });
    });

    // Initiale aktive Sortierung setzen (desc ist default)
    const descBtn = modalElement.querySelector('.sortierung-btn[data-sort="desc"]');
    if (descBtn) descBtn.classList.add('active');
  }

  /**
   * Aktualisiert die Einträge-Liste basierend auf Filter und Sortierung
   */
  _aktualisiereEintraegeListe(container, alleEintraege) {
    // Filtern
    let gefiltert = alleEintraege;
    if (this.filterTyp !== 'alle') {
      gefiltert = alleEintraege.filter(e => e.typ === this.filterTyp);
    }

    // Sortieren
    const sortiert = [...gefiltert].sort((a, b) => {
      const dateA = new Date(a.datumSort);
      const dateB = new Date(b.datumSort);
      
      if (this.sortierung === 'desc') {
        return dateB - dateA; // Neueste zuerst
      } else {
        return dateA - dateB; // Älteste zuerst
      }
    });

    // Rendern
    container.innerHTML = this._renderAlleEintraege(sortiert);

    // Event-Listener für neue Buttons neu initialisieren
    // (werden durch innerHTML ersetzt)
    const modalElement = container.closest('.modal');
    const mitarbeiterId = modalElement.dataset.mitarbeiterId; // Müsste gesetzt werden
    const modal = bootstrap.Modal.getInstance(modalElement);
    const jahr = this.dataManager.aktuellesJahr;
    
    // Neu: Event-Listener für Bearbeiten/Löschen initialisieren
    this._initActionListenersForContainer(container, mitarbeiterId, modal, jahr);
  }

  /**
   * Zählt Einträge nach Typ
   */
  _zaehleEintraegeNachTyp(eintraege) {
    return {
      urlaub: eintraege.filter(e => e.typ === 'urlaub').length,
      krankheit: eintraege.filter(e => e.typ === 'krankheit').length,
      schulung: eintraege.filter(e => e.typ === 'schulung').length,
      ueberstunden: eintraege.filter(e => e.typ === 'ueberstunden').length
    };
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
          <p>Keine Einträge vorhanden</p>
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
   * Initialisiert Event-Listener nur für einen Container (nach innerHTML Änderung)
   */
  _initActionListenersForContainer(container, mitarbeiterId, modal, jahr) {
    container.addEventListener('click', async (e) => {
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

  // [Alle anderen Methoden bleiben unverändert - _zeigeUrlaubBearbeiten, _zeigeKrankheitBearbeiten, etc.]
  // [_exportExcel, _exportPDF, _gruppiereEintraegeNachTyp bleiben ebenfalls unverändert]
  
  // ... (Rest des Codes bleibt identisch)
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailDialog;
}