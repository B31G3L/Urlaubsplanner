/**
 * Detail-Dialog
 * Zeigt alle Einträge eines Mitarbeiters für ein Jahr an
 * Ermöglicht das Bearbeiten und Löschen von Einträgen
 * 
 * NEUES LAYOUT:
 * - Links: ALLE Stammdaten (volle Höhe)
 * - Rechts oben: Statistik horizontal (KPI-Karten nebeneinander)
 * - Rechts unten: Einträge-Liste (scrollbar)
 */

class DetailDialog extends DialogBase {
  constructor(dataManager) {
    super(dataManager);
    this.filterTyp = 'alle';
    this.sortierung = 'desc';
  }

  /**
   * Zeigt Detail-Dialog für einen Mitarbeiter
   */
  async zeigeDetails(mitarbeiterId, jahr = null) {
    jahr = jahr || this.dataManager.aktuellesJahr;
    
    const stat = await this.dataManager.getMitarbeiterStatistik(mitarbeiterId);
    if (!stat) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    const ma = stat.mitarbeiter;
    const eintraege = await this._ladeAlleEintraege(mitarbeiterId, jahr);
    const alleEintraegeSortiert = this._kombiniereUndSortiereEintraege(eintraege);
    const ueberstundenGemacht = await this._berechneUeberstundenGemacht(mitarbeiterId, jahr);
    const anzahlNachTyp = this._zaehleEintraegeNachTyp(alleEintraegeSortiert);

    const modalHtml = `
      <div class="modal fade" id="detailModal" tabindex="-1">
        <div class="modal-dialog modal-fullscreen">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-person-circle"></i> ${ma.vorname} ${ma.nachname} - Details ${jahr}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
              <div class="row g-0" style="height: calc(100vh - 120px);">
                
                <!-- LINKE SPALTE: Alle Stammdaten (volle Höhe) -->
                <div class="col-md-4 border-end" style="overflow-y: auto; background-color: #1a1a1a;">
                  <div class="p-3">
                    
                    <!-- Buttons -->
                    <div class="d-flex gap-2 mb-3">
                      <button class="btn btn-outline-primary w-100" id="btnMitarbeiterBearbeiten">
                        <i class="bi bi-pencil"></i> Bearbeiten
                      </button>
                      <div class="btn-group">
                        <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                          <i class="bi bi-download"></i>
                        </button>
                        <ul class="dropdown-menu">
                          <li><a class="dropdown-item" href="#" id="btnExportExcel">
                            <i class="bi bi-file-earmark-excel text-success"></i> Excel
                          </a></li>
                          <li><a class="dropdown-item" href="#" id="btnExportPDF">
                            <i class="bi bi-file-earmark-pdf text-danger"></i> PDF
                          </a></li>
                        </ul>
                      </div>
                    </div>

                    <!-- Persönliche Daten -->
                    <div class="card bg-dark mb-3">
                      <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-person"></i> Persönliche Daten</h6>
                      </div>
                      <div class="card-body">
                        <table class="table table-sm table-borderless mb-0">
                          <tr>
                            <td class="text-muted" style="width: 40%;">Vorname:</td>
                            <td class="fw-bold">${ma.vorname}</td>
                          </tr>
                          <tr>
                            <td class="text-muted">Nachname:</td>
                            <td class="fw-bold">${ma.nachname}</td>
                          </tr>
                          ${ma.email ? `
                          <tr>
                            <td class="text-muted">Email:</td>
                            <td><small>${ma.email}</small></td>
                          </tr>
                          ` : ''}
                          ${ma.geburtsdatum ? `
                          <tr>
                            <td class="text-muted">Geburtsdatum:</td>
                            <td>${formatDatumAnzeige(ma.geburtsdatum)}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </div>
                    </div>

                    <!-- Arbeitsbeziehung -->
                    <div class="card bg-dark mb-3">
                      <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-briefcase"></i> Arbeitsbeziehung</h6>
                      </div>
                      <div class="card-body">
                        <table class="table table-sm table-borderless mb-0">
                          <tr>
                            <td class="text-muted" style="width: 40%;">Abteilung:</td>
                            <td>
                              <span class="abteilung-badge" style="background-color: ${ma.abteilung_farbe}">
                                ${ma.abteilung_name}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td class="text-muted">Eintrittsdatum:</td>
                            <td>${formatDatumAnzeige(ma.eintrittsdatum)}</td>
                          </tr>
                          ${ma.austrittsdatum ? `
                          <tr>
                            <td class="text-muted">Austrittsdatum:</td>
                            <td>
                              <span class="badge bg-danger">${formatDatumAnzeige(ma.austrittsdatum)}</span>
                            </td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td class="text-muted">Status:</td>
                            <td>
                              <span class="badge ${ma.status === 'AKTIV' ? 'bg-success' : 'bg-secondary'}">
                                ${ma.status}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </div>

                    <!-- Arbeitszeit -->
                    <div class="card bg-dark mb-3">
                      <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-clock-history"></i> Arbeitszeit</h6>
                      </div>
                      <div class="card-body">
                        <table class="table table-sm table-borderless mb-0">
                          <tr>
                            <td class="text-muted" style="width: 40%;">Wochenstunden:</td>
                            <td class="fw-bold">${ma.wochenstunden || 40}h</td>
                          </tr>
                        </table>
                        <div id="arbeitszeitmodellAnzeige" class="mt-2">
                          <small class="text-muted d-block mb-1">Wochenplan:</small>
                          <div class="text-muted small" style="line-height: 1.6;">
                            Wird geladen...
                          </div>
                        </div>
                        <button class="btn btn-sm btn-outline-info mt-2 w-100" id="btnArbeitszeitmodell">
                          <i class="bi bi-calendar-week"></i> Bearbeiten
                        </button>
                      </div>
                    </div>

                    <!-- Urlaub ${jahr} -->
                    <div class="card bg-dark mb-3">
                      <div class="card-header clickable" id="clickUrlaub" style="cursor: pointer;" title="Klicken um Urlaub einzutragen">
                        <div class="d-flex justify-content-between align-items-center">
                          <h6 class="mb-0"><i class="bi bi-calendar-check text-success"></i> Urlaub ${jahr}</h6>
                          <i class="bi bi-plus-circle text-success"></i>
                        </div>
                      </div>
                      <div class="card-body">
                        <table class="table table-sm table-borderless mb-0">
                          <tr>
                            <td class="text-muted" style="width: 40%;">Anspruch:</td>
                            <td class="fw-bold">${stat.urlaubsanspruch.toFixed(1)} Tage</td>
                          </tr>
                          <tr>
                            <td class="text-muted">Übertrag ${jahr-1}:</td>
                            <td>
                              <span class="clickable" id="clickUebertrag" style="cursor: pointer;" title="Klicken zum Anpassen">
                                ${stat.uebertrag_vorjahr.toFixed(1)} Tage
                                <i class="bi bi-pencil-square text-info ms-1"></i>
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td class="text-muted">Verfügbar:</td>
                            <td class="fw-bold text-info">${stat.urlaub_verfuegbar.toFixed(1)} Tage</td>
                          </tr>
                          <tr>
                            <td class="text-muted">Genommen:</td>
                            <td class="fw-bold text-warning">${stat.urlaub_genommen.toFixed(1)} Tage</td>
                          </tr>
                          <tr class="border-top">
                            <td class="text-muted fw-bold">Resturlaub:</td>
                            <td class="fs-5 fw-bold ${stat.urlaub_rest < 0 ? 'text-danger' : stat.urlaub_rest < 5 ? 'text-warning' : 'text-success'}">
                              ${stat.urlaub_rest.toFixed(1)} Tage
                            </td>
                          </tr>
                        </table>
                      </div>
                    </div>

                    <!-- Überstunden ${jahr} -->
                    <div class="card bg-dark">
                      <div class="card-header clickable" id="clickUeberstunden" style="cursor: pointer;" title="Klicken um Überstunden einzutragen">
                        <div class="d-flex justify-content-between align-items-center">
                          <h6 class="mb-0"><i class="bi bi-clock text-warning"></i> Überstunden ${jahr}</h6>
                          <i class="bi bi-plus-circle text-warning"></i>
                        </div>
                      </div>
                      <div class="card-body">
                        <table class="table table-sm table-borderless mb-0">
                          <tr>
                            <td class="text-muted" style="width: 40%;">Gemacht:</td>
                            <td class="fw-bold text-success">+${ueberstundenGemacht.toFixed(1)}h</td>
                          </tr>
                          <tr>
                            <td class="text-muted">Abgebaut:</td>
                            <td class="fw-bold text-danger">${(stat.ueberstunden - ueberstundenGemacht).toFixed(1)}h</td>
                          </tr>
                          <tr class="border-top">
                            <td class="text-muted fw-bold">Saldo:</td>
                            <td class="fs-5 fw-bold ${stat.ueberstunden >= 0 ? 'text-success' : 'text-danger'}">
                              ${stat.ueberstunden >= 0 ? '+' : ''}${stat.ueberstunden.toFixed(1)}h
                            </td>
                          </tr>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>

                <!-- RECHTE SPALTE: Statistik oben + Einträge unten -->
                <div class="col-md-8" style="display: flex; flex-direction: column;">
                  
                  <!-- Statistik horizontal (oben, fixes Layout) -->
                  <div class="p-3 border-bottom" style="flex-shrink: 0; background-color: #2d2d2d;">
                    <div class="row g-3">
                      <!-- Krankheit -->
                      <div class="col-md-4">
                        <div class="card bg-dark h-100 clickable" id="clickKrankheit" style="cursor: pointer; border-left: 3px solid #dc3545;">
                          <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <div class="text-muted small mb-1">
                                  <i class="bi bi-bandaid"></i> Krankheit ${jahr}
                                </div>
                                <div class="fs-3 fw-bold text-danger">${stat.krankheitstage.toFixed(1)}</div>
                                <div class="text-muted small">Tage</div>
                              </div>
                              <i class="bi bi-plus-circle fs-4 text-danger opacity-50"></i>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Schulung -->
                      <div class="col-md-4">
                        <div class="card bg-dark h-100 clickable" id="clickSchulung" style="cursor: pointer; border-left: 3px solid #17a2b8;">
                          <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <div class="text-muted small mb-1">
                                  <i class="bi bi-book"></i> Schulung ${jahr}
                                </div>
                                <div class="fs-3 fw-bold text-info">${stat.schulungstage.toFixed(1)}</div>
                                <div class="text-muted small">Tage</div>
                              </div>
                              <i class="bi bi-plus-circle fs-4 text-info opacity-50"></i>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Gesamt Einträge -->
                      <div class="col-md-4">
                        <div class="card bg-dark h-100" style="border-left: 3px solid #6c757d;">
                          <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <div class="text-muted small mb-1">
                                  <i class="bi bi-list-ul"></i> Alle Einträge
                                </div>
                                <div class="fs-3 fw-bold">${alleEintraegeSortiert.length}</div>
                                <div class="text-muted small">Einträge insgesamt</div>
                              </div>
                              <i class="bi bi-collection fs-4 opacity-50"></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Einträge-Liste (unten, scrollbar) -->
                  <div style="flex: 1; overflow-y: auto; background-color: #1a1a1a;">
                    <div class="p-3">
                      <!-- Toolbar -->
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                          <i class="bi bi-list-ul"></i> Alle Einträge (${alleEintraegeSortiert.length})
                        </h6>
                        <div class="d-flex gap-2">
                          <!-- Sortierung -->
                          <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-light sortierung-btn active" data-sort="desc" title="Neueste zuerst">
                              <i class="bi bi-sort-down"></i>
                            </button>
                            <button type="button" class="btn btn-outline-light sortierung-btn" data-sort="asc" title="Älteste zuerst">
                              <i class="bi bi-sort-up"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Filter Buttons -->
                      <div class="d-flex gap-2 flex-wrap mb-3">
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

                      <!-- Einträge Container -->
                      <div id="eintraegeContainer">
                        ${this._renderAlleEintraege(alleEintraegeSortiert)}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const oldModals = document.querySelectorAll('.modal');
    oldModals.forEach(m => {
      const existingModal = bootstrap.Modal.getInstance(m);
      if (existingModal) existingModal.dispose();
      m.remove();
    });

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalElement = document.querySelector('#detailModal');
    const modal = new bootstrap.Modal(modalElement);

    // Event-Listener
    this._initActionListeners(modalElement, mitarbeiterId, modal, jahr);
    this._initFilterUndSortierung(modalElement, alleEintraegeSortiert);
    this._initClickHandlers(modalElement, mitarbeiterId, modal, jahr);

    // Lade und zeige Arbeitszeitmodell
    await this._ladeUndZeigeArbeitszeitmodell(mitarbeiterId);

    modal.show();

    return new Promise((resolve) => {
      modalElement.addEventListener('hidden.bs.modal', () => {
        modal.dispose();
        modalElement.remove();
        resolve();
      }, { once: true });
    });
  }

  /**
   * Initialisiert Click-Handler für KPI-Karten und Buttons
   */
  _initClickHandlers(modalElement, mitarbeiterId, modal, jahr) {
    // Urlaub eintragen
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

    // Übertrag anpassen
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

    // Krankheit eintragen
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

    // Schulung eintragen
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

    // Überstunden eintragen
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

    // Mitarbeiter bearbeiten
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

    // Arbeitszeitmodell
    const btnArbeitszeitmodell = modalElement.querySelector('#btnArbeitszeitmodell');
    if (btnArbeitszeitmodell) {
      btnArbeitszeitmodell.addEventListener('click', async () => {
        modal.hide();
        if (typeof dialogManager !== 'undefined') {
          await dialogManager.zeigeArbeitszeitmodell(mitarbeiterId, async () => {
            setTimeout(() => this.zeigeDetails(mitarbeiterId, jahr), 300);
          });
        }
      });
    }

    // Export-Buttons
    const btnExportExcel = modalElement.querySelector('#btnExportExcel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', async (e) => {
        e.preventDefault();
        showNotification('Info', 'Excel-Export in Entwicklung', 'info');
      });
    }

    const btnExportPDF = modalElement.querySelector('#btnExportPDF');
    if (btnExportPDF) {
      btnExportPDF.addEventListener('click', async (e) => {
        e.preventDefault();
        showNotification('Info', 'PDF-Export in Entwicklung', 'info');
      });
    }
  }

  /**
   * Initialisiert Filter und Sortierung
   */
  _initFilterUndSortierung(modalElement, alleEintraege) {
    const filterButtons = modalElement.querySelectorAll('.filter-btn');
    const sortierungButtons = modalElement.querySelectorAll('.sortierung-btn');
    const container = modalElement.querySelector('#eintraegeContainer');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterTyp = btn.dataset.filter;
        this._aktualisiereEintraegeListe(container, alleEintraege);
      });
    });

    sortierungButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sortierungButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sortierung = btn.dataset.sort;
        this._aktualisiereEintraegeListe(container, alleEintraege);
      });
    });
  }

  /**
   * Aktualisiert die Einträge-Liste
   */
  _aktualisiereEintraegeListe(container, alleEintraege) {
    let gefiltert = alleEintraege;
    if (this.filterTyp !== 'alle') {
      gefiltert = alleEintraege.filter(e => e.typ === this.filterTyp);
    }

    const sortiert = [...gefiltert].sort((a, b) => {
      const dateA = new Date(a.datumSort);
      const dateB = new Date(b.datumSort);
      return this.sortierung === 'desc' ? dateB - dateA : dateA - dateB;
    });

    container.innerHTML = this._renderAlleEintraege(sortiert);
    this._initActionListenersForContainer(container, null, null, null);
  }

  /**
   * Rendert alle Einträge als Liste
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
   * Initialisiert Event-Listener für Aktionen
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

  _initActionListenersForContainer(container, mitarbeiterId, modal, jahr) {
    // Implementierung für Container-spezifische Listener
  }

  async _handleDelete(deleteBtn, mitarbeiterId, modal, jahr) {
    const id = parseInt(deleteBtn.dataset.id);
    const typ = deleteBtn.dataset.typ;

    if (!confirm(`Möchten Sie diesen ${this._getTypLabel(typ)}-Eintrag wirklich löschen?`)) {
      return;
    }

    try {
      const tabelle = typ === 'ueberstunden' ? 'ueberstunden' : typ;
      const result = await this.dataManager.db.run(`DELETE FROM ${tabelle} WHERE id = ?`, [id]);

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

  async _handleEdit(editBtn, mitarbeiterId, modal, jahr) {
    showNotification('Info', 'Bearbeiten-Funktion in Entwicklung', 'info');
  }

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

  _getTypLabel(typ) {
    const labels = {
      urlaub: 'Urlaub',
      krankheit: 'Krankheit',
      schulung: 'Schulung',
      ueberstunden: 'Überstunden'
    };
    return labels[typ] || typ;
  }

  _zaehleEintraegeNachTyp(eintraege) {
    return {
      urlaub: eintraege.filter(e => e.typ === 'urlaub').length,
      krankheit: eintraege.filter(e => e.typ === 'krankheit').length,
      schulung: eintraege.filter(e => e.typ === 'schulung').length,
      ueberstunden: eintraege.filter(e => e.typ === 'ueberstunden').length
    };
  }

  async _ladeAlleEintraege(mitarbeiterId, jahr) {
    const jahrStr = jahr.toString();

    const urlaubResult = await this.dataManager.db.query(`
      SELECT * FROM urlaub 
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
      ORDER BY von_datum DESC
    `, [mitarbeiterId, jahrStr]);

    const krankheitResult = await this.dataManager.db.query(`
      SELECT * FROM krankheit 
      WHERE mitarbeiter_id = ? AND strftime('%Y', von_datum) = ?
      ORDER BY von_datum DESC
    `, [mitarbeiterId, jahrStr]);

    const schulungResult = await this.dataManager.db.query(`
      SELECT * FROM schulung 
      WHERE mitarbeiter_id = ? AND strftime('%Y', datum) = ?
      ORDER BY datum DESC
    `, [mitarbeiterId, jahrStr]);

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

  _kombiniereUndSortiereEintraege(eintraege) {
    const alle = [];

    eintraege.urlaub.forEach(e => {
      alle.push({
        typ: 'urlaub',
        datum: e.von_datum,
        datumSort: e.von_datum,
        ...e
      });
    });

    eintraege.krankheit.forEach(e => {
      alle.push({
        typ: 'krankheit',
        datum: e.von_datum,
        datumSort: e.von_datum,
        ...e
      });
    });

    eintraege.schulung.forEach(e => {
      alle.push({
        typ: 'schulung',
        datum: e.datum,
        datumSort: e.datum,
        ...e
      });
    });

    eintraege.ueberstunden.forEach(e => {
      alle.push({
        typ: 'ueberstunden',
        datum: e.datum,
        datumSort: e.datum,
        ...e
      });
    });

    alle.sort((a, b) => new Date(b.datumSort) - new Date(a.datumSort));
    return alle;
  }

  /**
   * Lädt und zeigt das Arbeitszeitmodell an
   */
  async _ladeUndZeigeArbeitszeitmodell(mitarbeiterId) {
    const container = document.getElementById('arbeitszeitmodellAnzeige');
    if (!container) return;

    try {
      // Lade Arbeitszeitmodell aus Datenbank
      const modell = await this.dataManager.getArbeitszeitmodell(mitarbeiterId);
      
      const wochentage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
      const labels = {
        'VOLL': 'ganz',
        'HALB': 'halb',
        'FREI': 'frei'
      };

      let html = '<small class="text-muted d-block mb-1">Wochenplan:</small>';
      html += '<div class="text-light small" style="line-height: 1.6;">';

      if (modell.length === 0) {
        // Standard-Modell: Mo-Fr ganz, Sa-So frei
        html += 'Mo-Fr: <span class="text-success">ganz</span><br>';
        html += 'Sa-So: <span class="text-muted">frei</span>';
      } else {
        // Gruppiere aufeinanderfolgende Tage mit gleicher Arbeitszeit
        const gruppen = [];
        let aktuelleGruppe = null;

        for (let i = 0; i < 7; i++) {
          const tagModell = modell.find(m => m.wochentag === i);
          const arbeitszeit = tagModell ? tagModell.arbeitszeit : (i < 5 ? 'VOLL' : 'FREI');

          if (!aktuelleGruppe || aktuelleGruppe.arbeitszeit !== arbeitszeit) {
            // Neue Gruppe starten
            if (aktuelleGruppe) {
              gruppen.push(aktuelleGruppe);
            }
            aktuelleGruppe = {
              start: i,
              end: i,
              arbeitszeit: arbeitszeit
            };
          } else {
            // Gruppe erweitern
            aktuelleGruppe.end = i;
          }
        }
        
        // Letzte Gruppe hinzufügen
        if (aktuelleGruppe) {
          gruppen.push(aktuelleGruppe);
        }

        // Gruppen rendern
        gruppen.forEach((gruppe, index) => {
          const label = labels[gruppe.arbeitszeit] || gruppe.arbeitszeit.toLowerCase();
          const colorClass = gruppe.arbeitszeit === 'VOLL' ? 'text-success' : 
                            gruppe.arbeitszeit === 'HALB' ? 'text-warning' : 
                            'text-muted';
          
          if (gruppe.start === gruppe.end) {
            // Einzelner Tag
            html += `${wochentage[gruppe.start]}: <span class="${colorClass}">${label}</span>`;
          } else {
            // Mehrere Tage
            html += `${wochentage[gruppe.start]}-${wochentage[gruppe.end]}: <span class="${colorClass}">${label}</span>`;
          }
          
          if (index < gruppen.length - 1) {
            html += '<br>';
          }
        });
      }

      html += '</div>';
      container.innerHTML = html;

    } catch (error) {
      console.error('Fehler beim Laden des Arbeitszeitmodells:', error);
      container.innerHTML = `
        <small class="text-muted d-block mb-1">Wochenplan:</small>
        <div class="text-muted small">
          Standard: Mo-Fr ganz
        </div>
      `;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailDialog;
}