/**
 * Arbeitszeitmodell-Dialog
 * Verwaltet Wochenstunden und tägliche Arbeitszeiten
 */

class ArbeitszeitmodellDialog extends DialogBase {
  /**
   * Zeigt Arbeitszeitmodell-Dialog
   */
  async zeigeArbeitszeitmodell(mitarbeiterId, callback) {
    const mitarbeiter = await this.dataManager.getMitarbeiter(mitarbeiterId);
    if (!mitarbeiter) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    // Lade aktuelles Arbeitszeitmodell
    const modell = await this.dataManager.getArbeitszeitmodell(mitarbeiterId);
    
    // Berechne Sollstunden basierend auf Modell
    const sollstunden = this._berechneSollstunden(modell);

    const wochentage = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    
    const tageRows = wochentage.map((tag, index) => {
      const tagModell = modell.find(m => m.wochentag === index);
      const arbeitszeit = tagModell ? tagModell.arbeitszeit : 'VOLL';
      
      return `
        <tr>
          <td class="fw-bold">${tag}</td>
          <td>
            <div class="btn-group w-100" role="group">
              <input type="radio" class="btn-check" name="tag_${index}" id="tag_${index}_voll" 
                     value="VOLL" ${arbeitszeit === 'VOLL' ? 'checked' : ''}>
              <label class="btn btn-outline-success btn-sm" for="tag_${index}_voll">
                <i class="bi bi-check-circle"></i> Ganztags
              </label>
              
              <input type="radio" class="btn-check" name="tag_${index}" id="tag_${index}_halb" 
                     value="HALB" ${arbeitszeit === 'HALB' ? 'checked' : ''}>
              <label class="btn btn-outline-warning btn-sm" for="tag_${index}_halb">
                <i class="bi bi-clock"></i> Halbtags
              </label>
              
              <input type="radio" class="btn-check" name="tag_${index}" id="tag_${index}_frei" 
                     value="FREI" ${arbeitszeit === 'FREI' ? 'checked' : ''}>
              <label class="btn btn-outline-danger btn-sm" for="tag_${index}_frei">
                <i class="bi bi-x-circle"></i> Frei
              </label>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const modalHtml = `
      <div class="modal fade" id="arbeitszeitmodellModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title">
                <i class="bi bi-clock-history"></i> Arbeitszeitmodell - ${mitarbeiter.vorname} ${mitarbeiter.nachname}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <!-- Wochenstunden -->
              <div class="card bg-dark mb-3">
                <div class="card-header">
                  <h6 class="mb-0"><i class="bi bi-calendar-week"></i> Wochenstunden</h6>
                </div>
                <div class="card-body">
                  <div class="row align-items-center">
                    <div class="col-md-8">
                      <label class="form-label">Gesamte Arbeitsstunden pro Woche:</label>
                      <div class="input-group">
                        <input type="number" class="form-control" id="wochenstunden" 
                               value="${mitarbeiter.wochenstunden || 40}" 
                               min="0" max="60" step="0.5" required>
                        <span class="input-group-text">Stunden</span>
                      </div>
                      <small class="text-muted">Standard Vollzeit: 40 Stunden</small>
                    </div>
                    <div class="col-md-4">
                      <div class="alert alert-info mb-0">
                        <div class="text-center">
                          <small class="d-block text-muted">Sollstunden/Woche:</small>
                          <strong class="fs-5" id="sollstundenAnzeige">${sollstunden.toFixed(1)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-3">
                    <strong>Schnellauswahl:</strong>
                    <div class="btn-group mt-2" role="group">
                      <button type="button" class="btn btn-sm btn-outline-primary stunden-preset" data-stunden="40">
                        Vollzeit (40h)
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-primary stunden-preset" data-stunden="30">
                        75% (30h)
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-primary stunden-preset" data-stunden="20">
                        Teilzeit (20h)
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-primary stunden-preset" data-stunden="15">
                        Geringfügig (15h)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Wochenplan -->
              <div class="card bg-dark">
                <div class="card-header">
                  <h6 class="mb-0"><i class="bi bi-calendar3"></i> Wochenplan</h6>
                </div>
                <div class="card-body">
                  <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> 
                    <strong>Hinweis:</strong> Definieren Sie für jeden Wochentag die Arbeitszeit. 
                    Dies wird bei der Berechnung von Urlaubstagen berücksichtigt.
                  </div>
                  
                  <div class="table-responsive">
                    <table class="table table-hover">
                      <thead class="table-dark">
                        <tr>
                          <th style="width: 30%;">Wochentag</th>
                          <th style="width: 70%;">Arbeitszeit</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tageRows}
                      </tbody>
                    </table>
                  </div>

                  <!-- Schnellauswahl Templates -->
                  <div class="mt-3">
                    <strong>Schnellauswahl Templates:</strong>
                    <div class="d-flex gap-2 mt-2 flex-wrap">
                      <button type="button" class="btn btn-sm btn-outline-secondary template-btn" data-template="vollzeit">
                        <i class="bi bi-calendar-check"></i> Vollzeit (Mo-Fr)
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary template-btn" data-template="teilzeit4">
                        <i class="bi bi-calendar4-week"></i> 4-Tage-Woche
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary template-btn" data-template="teilzeit3">
                        <i class="bi bi-calendar3"></i> 3-Tage-Woche
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary template-btn" data-template="montag_frei">
                        <i class="bi bi-calendar-x"></i> Montag frei
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary template-btn" data-template="freitag_frei">
                        <i class="bi bi-calendar-x"></i> Freitag frei
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
      const wochenstunden = parseFloat(document.getElementById('wochenstunden').value);
      
      // Sammle Wochenplan
      const wochenplan = [];
      for (let i = 0; i < 7; i++) {
        const selected = document.querySelector(`input[name="tag_${i}"]:checked`);
        if (selected) {
          wochenplan.push({
            wochentag: i,
            arbeitszeit: selected.value
          });
        }
      }

      try {
        await this.dataManager.speichereArbeitszeitmodell(mitarbeiterId, wochenstunden, wochenplan);
        showNotification('Erfolg', 'Arbeitszeitmodell wurde gespeichert', 'success');
        if (callback) await callback();
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });

    // Event-Listener initialisieren
    setTimeout(() => {
      this._initEventListeners();
    }, 100);
  }

  /**
   * Initialisiert Event-Listener
   */
  _initEventListeners() {
    const wochenstundenInput = document.getElementById('wochenstunden');
    const sollstundenAnzeige = document.getElementById('sollstundenAnzeige');

    // Update Sollstunden bei Änderungen
    const updateSollstunden = () => {
      const wochenstunden = parseFloat(wochenstundenInput.value) || 40;
      const modell = this._sammelWochenplan();
      const sollstunden = this._berechneSollstundenAusWochenplan(wochenstunden, modell);
      sollstundenAnzeige.textContent = sollstunden.toFixed(1);
    };

    // Wochenstunden Input
    wochenstundenInput.addEventListener('input', updateSollstunden);

    // Radio Buttons für Tage
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', updateSollstunden);
    });

    // Stunden-Presets
    document.querySelectorAll('.stunden-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        wochenstundenInput.value = btn.dataset.stunden;
        updateSollstunden();
      });
    });

    // Template Buttons
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._applyTemplate(btn.dataset.template);
        updateSollstunden();
      });
    });
  }

  /**
   * Sammelt aktuellen Wochenplan aus Formular
   */
  _sammelWochenplan() {
    const plan = [];
    for (let i = 0; i < 7; i++) {
      const selected = document.querySelector(`input[name="tag_${i}"]:checked`);
      if (selected) {
        plan.push({
          wochentag: i,
          arbeitszeit: selected.value
        });
      }
    }
    return plan;
  }

  /**
   * Berechnet Sollstunden aus Wochenplan
   */
  _berechneSollstundenAusWochenplan(wochenstunden, modell) {
    let vollTage = 0;
    let halbTage = 0;
    
    modell.forEach(tag => {
      if (tag.arbeitszeit === 'VOLL') vollTage++;
      else if (tag.arbeitszeit === 'HALB') halbTage++;
    });
    
    // Wenn keine Angaben, Standard 5-Tage-Woche
    if (vollTage === 0 && halbTage === 0) {
      return wochenstunden;
    }
    
    const stundenProTag = wochenstunden / 5; // Basis: 5-Tage-Woche
    return (vollTage * stundenProTag) + (halbTage * stundenProTag * 0.5);
  }

  /**
   * Berechnet Sollstunden aus geladenem Modell
   */
  _berechneSollstunden(modell) {
    const wochenstunden = 40; // Default, wird überschrieben
    return this._berechneSollstundenAusWochenplan(wochenstunden, modell);
  }

  /**
   * Wendet ein Template an
   */
  _applyTemplate(template) {
    // Standard: Alle auf VOLL setzen
    const setAll = (value) => {
      for (let i = 0; i < 7; i++) {
        const radio = document.querySelector(`input[name="tag_${i}"][value="${value}"]`);
        if (radio) radio.checked = true;
      }
    };

    const setTag = (tag, value) => {
      const radio = document.querySelector(`input[name="tag_${tag}"][value="${value}"]`);
      if (radio) radio.checked = true;
    };

    switch (template) {
      case 'vollzeit':
        // Mo-Fr Voll, Sa+So Frei
        for (let i = 0; i < 5; i++) setTag(i, 'VOLL');
        setTag(5, 'FREI');
        setTag(6, 'FREI');
        break;
        
      case 'teilzeit4':
        // Mo-Do Voll, Fr+Sa+So Frei
        for (let i = 0; i < 4; i++) setTag(i, 'VOLL');
        setTag(4, 'FREI');
        setTag(5, 'FREI');
        setTag(6, 'FREI');
        break;
        
      case 'teilzeit3':
        // Mo-Mi Voll, Do-So Frei
        for (let i = 0; i < 3; i++) setTag(i, 'VOLL');
        for (let i = 3; i < 7; i++) setTag(i, 'FREI');
        break;
        
      case 'montag_frei':
        // Mo Frei, Di-Fr Voll, Sa+So Frei
        setTag(0, 'FREI');
        for (let i = 1; i < 5; i++) setTag(i, 'VOLL');
        setTag(5, 'FREI');
        setTag(6, 'FREI');
        break;
        
      case 'freitag_frei':
        // Mo-Do Voll, Fr+Sa+So Frei
        for (let i = 0; i < 4; i++) setTag(i, 'VOLL');
        for (let i = 4; i < 7; i++) setTag(i, 'FREI');
        break;
    }
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArbeitszeitmodellDialog;
}