/**
 * Arbeitszeitmodell-Dialog
 * Verwaltet Wochenstunden und tägliche Arbeitszeiten
 * 
 * BEREINIGT: Ohne Sollstunden-Anzeige und Hinweis
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
              <form id="arbeitszeitmodellForm">
                <!-- Wochenstunden -->
                <div class="card bg-dark mb-3">
                  <div class="card-header">
                    <h6 class="mb-0"><i class="bi bi-calendar-week"></i> Wochenstunden</h6>
                  </div>
                  <div class="card-body">
                    <div class="mb-0">
                      <label class="form-label">Gesamte Arbeitsstunden pro Woche:</label>
                      <div class="input-group">
                        <input type="number" class="form-control" id="wochenstunden" 
                               value="${mitarbeiter.wochenstunden || 40}" 
                               min="0" max="60" step="0.5" required>
                        <span class="input-group-text">Stunden</span>
                      </div>
                      <small class="text-muted">Standard Vollzeit: 40 Stunden</small>
                    </div>
                  </div>
                </div>

                <!-- Wochenplan -->
                <div class="card bg-dark">
                  <div class="card-header">
                    <h6 class="mb-0"><i class="bi bi-calendar3"></i> Wochenplan</h6>
                  </div>
                  <div class="card-body">
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
                  </div>
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
    // Keine Event-Listener mehr nötig - Schnellauswahl entfernt
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArbeitszeitmodellDialog;
}