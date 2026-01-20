/**
 * Übertrag-Dialog
 * Manuelles Anpassen des Übertrags für ein Jahr
 * 
 * NEU: Kompletter Dialog für manuelle Übertrag-Anpassung
 */

class UebertragDialog extends DialogBase {
  /**
   * Zeigt Dialog zum manuellen Anpassen des Übertrags
   */
  async zeigeUebertragAnpassen(mitarbeiterId, callback) {
    const stat = await this.dataManager.getMitarbeiterStatistik(mitarbeiterId);
    if (!stat) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    const ma = stat.mitarbeiter;
    const jahr = this.dataManager.aktuellesJahr;
    
    // Prüfe ob bereits manueller Übertrag vorhanden
    const manuell = await this.dataManager.getManuellAngepassterUebertrag(mitarbeiterId, jahr);
    const aktuellAngepasst = manuell !== null;
    const aktuellerWert = aktuellAngepasst ? manuell.uebertrag_tage : stat.uebertrag_vorjahr;

    const modalHtml = `
      <div class="modal fade" id="uebertragModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title">
                <i class="bi bi-calendar-plus"></i> Übertrag anpassen
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <p><strong>Mitarbeiter:</strong> ${ma.vorname} ${ma.nachname}</p>
                <p><strong>Jahr:</strong> ${jahr}</p>
                <p><strong>Aktueller Übertrag:</strong> ${formatZahl(aktuellerWert)} Tage
                  ${aktuellAngepasst ? '<span class="badge bg-warning text-dark ms-2">Manuell angepasst</span>' : '<span class="badge bg-secondary ms-2">Automatisch berechnet</span>'}
                </p>
              </div>

              ${aktuellAngepasst && manuell.notiz ? `
                <div class="alert alert-info mb-3">
                  <strong>Notiz:</strong> ${manuell.notiz}
                </div>
              ` : ''}

              <form id="uebertragForm">
                <div class="mb-3">
                  <label class="form-label">Neuer Übertrag (Tage) *</label>
                  <input type="number" class="form-control" id="uebertragTage" 
                         value="${formatZahl(aktuellerWert)}" 
                         step="0.5" min="0" max="100" required>
                  <small class="form-text text-muted">
                    Dieser Wert wird für ${jahr} verwendet und überschreibt die automatische Berechnung.
                  </small>
                </div>

                <div class="mb-3">
                  <label class="form-label">Notiz (optional)</label>
                  <textarea class="form-control" id="notiz" rows="2" 
                            placeholder="z.B. Sondervereinbarung, Korrektur...">${aktuellAngepasst && manuell.notiz ? manuell.notiz : ''}</textarea>
                </div>

                ${aktuellAngepasst ? `
                  <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="zuruecksetzen">
                    <label class="form-check-label" for="zuruecksetzen">
                      Manuelle Anpassung entfernen (zurück zur automatischen Berechnung)
                    </label>
                  </div>
                ` : ''}
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
      const zuruecksetzen = document.getElementById('zuruecksetzen');
      
      if (zuruecksetzen && zuruecksetzen.checked) {
        // Manuelle Anpassung entfernen
        try {
          await this.dataManager.loescheManuellAngepassterUebertrag(mitarbeiterId, jahr);
          showNotification('Erfolg', 'Übertrag wurde auf automatische Berechnung zurückgesetzt', 'success');
          if (callback) await callback();
          return true;
        } catch (error) {
          showNotification('Fehler', error.message, 'danger');
          return false;
        }
      }

      const form = document.getElementById('uebertragForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const tage = parseFloat(document.getElementById('uebertragTage').value);
      const notiz = document.getElementById('notiz').value.trim() || null;

      try {
        await this.dataManager.setManuellAngepassterUebertrag(mitarbeiterId, jahr, tage, notiz);
        showNotification('Erfolg', `Übertrag wurde auf ${formatZahl(tage)} Tage angepasst`, 'success');
        if (callback) await callback();
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UebertragDialog;
}