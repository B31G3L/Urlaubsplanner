/**
 * Urlaubs-Dialog
 * Urlaub hinzufügen und bearbeiten
 * 
 * FIX: Von/Bis Datum wird nicht mehr überschrieben beim Tab-Wechsel
 */

class UrlaubDialog extends DialogBase {
  /**
   * Zeigt Urlaub Hinzufügen Dialog
   */
  async zeigeUrlaubHinzufuegen(mitarbeiterId, callback) {
    const mitarbeiter = await this.dataManager.getMitarbeiter(mitarbeiterId);
    if (!mitarbeiter) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    const modalHtml = `
      <div class="modal fade" id="urlaubModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-calendar-plus"></i> Urlaub hinzufügen
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-bold">
                  <i class="bi bi-person"></i> ${mitarbeiter.vorname} ${mitarbeiter.nachname}
                </label>
              </div>

              <form id="urlaubForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Von *</label>
                    <input type="date" class="form-control" id="urlaubVon" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Bis *</label>
                    <input type="date" class="form-control" id="urlaubBis" required>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Anzahl Tage</label>
                  <input type="number" class="form-control" id="urlaubTage" step="0.5" min="0.5" readonly>
                  <small class="form-text text-muted">Wird automatisch berechnet</small>
                </div>

                <div class="mb-3">
                  <label class="form-label">Typ *</label>
                  <select class="form-select" id="urlaubTyp" required>
                    <option value="Urlaub">Urlaub</option>
                    <option value="Sonderurlaub">Sonderurlaub</option>
                    <option value="Unbezahlt">Unbezahlt</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label">Bemerkung</label>
                  <textarea class="form-control" id="urlaubBemerkung" rows="2"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
              <button type="button" class="btn btn-primary" id="btnSpeichern">
                <i class="bi bi-check-lg"></i> Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.showModal(modalHtml, async () => {
      const form = document.getElementById('urlaubForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const von = document.getElementById('urlaubVon').value;
      const bis = document.getElementById('urlaubBis').value;
      
      if (von > bis) {
        showNotification('Fehler', 'Das End-Datum muss nach dem Start-Datum liegen', 'warning');
        return false;
      }

      const daten = {
        von: von,
        bis: bis,
        tage: parseFloat(document.getElementById('urlaubTage').value),
        typ: document.getElementById('urlaubTyp').value,
        bemerkung: document.getElementById('urlaubBemerkung').value || null
      };

      try {
        await this.dataManager.urlaubHinzufuegen(mitarbeiterId, daten);
        showNotification('Erfolg', 'Urlaub wurde hinzugefügt', 'success');
        if (callback) await callback();
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });

    // FIX: Verbesserte Datum-Logik - nur noch einmal beim Laden
    setTimeout(() => {
      const vonField = document.getElementById('urlaubVon');
      const bisField = document.getElementById('urlaubBis');
      const tageField = document.getElementById('urlaubTage');

      // Setze heutiges Datum als Standardwert
      const heute = new Date().toISOString().split('T')[0];
      vonField.value = heute;
      bisField.value = heute;

      // Flag um zu verhindern dass Bis überschrieben wird
      let bisManuallyEdited = false;

      /**
       * Berechnet Arbeitstage zwischen zwei Daten
       */
      const berechneArbeitstage = (von, bis) => {
        if (!von || !bis) return 0;
        
        const start = new Date(von);
        const end = new Date(bis);
        let tage = 0;
        
        const current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Nicht Sonntag (0) oder Samstag (6)
            tage++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        return tage;
      };

      /**
       * Aktualisiert die Tage-Berechnung
       */
      const aktualisiereTage = () => {
        const von = vonField.value;
        const bis = bisField.value;
        
        if (von && bis) {
          const tage = berechneArbeitstage(von, bis);
          tageField.value = tage;
        }
      };

      // FIX: Von-Feld Change - NUR wenn Bis NICHT manuell bearbeitet wurde
      vonField.addEventListener('change', () => {
        const von = vonField.value;
        
        // Setze Bis nur automatisch, wenn es noch nicht manuell geändert wurde
        if (!bisManuallyEdited && von) {
          bisField.value = von;
        }
        
        aktualisiereTage();
      });

      // FIX: Bis-Feld Input - markiere als manuell bearbeitet
      bisField.addEventListener('input', () => {
        bisManuallyEdited = true;
      });

      // Bis-Feld Change - berechne Tage
      bisField.addEventListener('change', () => {
        aktualisiereTage();
      });

      // Initiale Berechnung
      aktualisiereTage();
    }, 100);
  }

  /**
   * Zeigt Urlaub Bearbeiten Dialog
   */
  async zeigeUrlaubBearbeiten(urlaubId, callback) {
    const urlaub = await this.dataManager.getUrlaub(urlaubId);
    if (!urlaub) {
      showNotification('Fehler', 'Urlaub nicht gefunden', 'danger');
      return;
    }

    const mitarbeiter = await this.dataManager.getMitarbeiter(urlaub.mitarbeiter_id);

    const modalHtml = `
      <div class="modal fade" id="urlaubBearbeitenModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-pencil-square"></i> Urlaub bearbeiten
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-bold">
                  <i class="bi bi-person"></i> ${mitarbeiter.vorname} ${mitarbeiter.nachname}
                </label>
              </div>

              <form id="urlaubBearbeitenForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Von *</label>
                    <input type="date" class="form-control" id="urlaubVon" value="${urlaub.von}" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Bis *</label>
                    <input type="date" class="form-control" id="urlaubBis" value="${urlaub.bis}" required>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Anzahl Tage</label>
                  <input type="number" class="form-control" id="urlaubTage" value="${urlaub.tage}" step="0.5" min="0.5" readonly>
                  <small class="form-text text-muted">Wird automatisch berechnet</small>
                </div>

                <div class="mb-3">
                  <label class="form-label">Typ *</label>
                  <select class="form-select" id="urlaubTyp" required>
                    <option value="Urlaub" ${urlaub.typ === 'Urlaub' ? 'selected' : ''}>Urlaub</option>
                    <option value="Sonderurlaub" ${urlaub.typ === 'Sonderurlaub' ? 'selected' : ''}>Sonderurlaub</option>
                    <option value="Unbezahlt" ${urlaub.typ === 'Unbezahlt' ? 'selected' : ''}>Unbezahlt</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label">Bemerkung</label>
                  <textarea class="form-control" id="urlaubBemerkung" rows="2">${urlaub.bemerkung || ''}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
              <button type="button" class="btn btn-primary" id="btnSpeichern">
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

      const von = document.getElementById('urlaubVon').value;
      const bis = document.getElementById('urlaubBis').value;
      
      if (von > bis) {
        showNotification('Fehler', 'Das End-Datum muss nach dem Start-Datum liegen', 'warning');
        return false;
      }

      const daten = {
        von: von,
        bis: bis,
        tage: parseFloat(document.getElementById('urlaubTage').value),
        typ: document.getElementById('urlaubTyp').value,
        bemerkung: document.getElementById('urlaubBemerkung').value || null
      };

      try {
        await this.dataManager.urlaubAktualisieren(urlaubId, daten);
        showNotification('Erfolg', 'Urlaub wurde aktualisiert', 'success');
        if (callback) await callback();
        return true;
      } catch (error) {
        showNotification('Fehler', error.message, 'danger');
        return false;
      }
    });

    // FIX: Gleiche verbesserte Logik für Bearbeiten-Dialog
    setTimeout(() => {
      const vonField = document.getElementById('urlaubVon');
      const bisField = document.getElementById('urlaubBis');
      const tageField = document.getElementById('urlaubTage');

      // Flag um zu verhindern dass Bis überschrieben wird
      let bisManuallyEdited = false;

      const berechneArbeitstage = (von, bis) => {
        if (!von || !bis) return 0;
        
        const start = new Date(von);
        const end = new Date(bis);
        let tage = 0;
        
        const current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            tage++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        return tage;
      };

      const aktualisiereTage = () => {
        const von = vonField.value;
        const bis = bisField.value;
        
        if (von && bis) {
          const tage = berechneArbeitstage(von, bis);
          tageField.value = tage;
        }
      };

      // FIX: Von-Feld Change - NUR wenn Bis NICHT manuell bearbeitet wurde
      vonField.addEventListener('change', () => {
        const von = vonField.value;
        
        // Setze Bis nur automatisch, wenn es noch nicht manuell geändert wurde
        if (!bisManuallyEdited && von && !bisField.value) {
          bisField.value = von;
        }
        
        aktualisiereTage();
      });

      // FIX: Bis-Feld Input - markiere als manuell bearbeitet
      bisField.addEventListener('input', () => {
        bisManuallyEdited = true;
      });

      // Bis-Feld Change - berechne Tage
      bisField.addEventListener('change', () => {
        aktualisiereTage();
      });

      // Initiale Berechnung
      aktualisiereTage();
    }, 100);
  }

  /**
   * Zeigt alle Urlaube eines Mitarbeiters
   */
  async zeigeUrlaubeVerwalten(mitarbeiterId, callback) {
    const mitarbeiter = await this.dataManager.getMitarbeiter(mitarbeiterId);
    if (!mitarbeiter) {
      showNotification('Fehler', 'Mitarbeiter nicht gefunden', 'danger');
      return;
    }

    const urlaube = await this.dataManager.getAlleUrlaubeVonMitarbeiter(mitarbeiterId);

    const urlaubeRows = urlaube.map(urlaub => {
      const vonDatum = new Date(urlaub.von).toLocaleDateString('de-DE');
      const bisDatum = new Date(urlaub.bis).toLocaleDateString('de-DE');
      
      let typBadge = '';
      if (urlaub.typ === 'Urlaub') {
        typBadge = '<span class="badge bg-success">Urlaub</span>';
      } else if (urlaub.typ === 'Sonderurlaub') {
        typBadge = '<span class="badge bg-info">Sonderurlaub</span>';
      } else {
        typBadge = '<span class="badge bg-warning">Unbezahlt</span>';
      }

      return `
        <tr>
          <td>${vonDatum}</td>
          <td>${bisDatum}</td>
          <td>${urlaub.tage}</td>
          <td>${typBadge}</td>
          <td>${urlaub.bemerkung || '-'}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-bearbeiten" data-id="${urlaub.id}" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-loeschen" data-id="${urlaub.id}" title="Löschen">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const modalHtml = `
      <div class="modal fade" id="urlaubeVerwaltungModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-calendar-week"></i> Urlaube verwalten - ${mitarbeiter.vorname} ${mitarbeiter.nachname}
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table class="table table-hover table-striped">
                  <thead class="table-dark">
                    <tr>
                      <th>Von</th>
                      <th>Bis</th>
                      <th>Tage</th>
                      <th>Typ</th>
                      <th>Bemerkung</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody id="urlaubeVerwaltungTabelleBody">
                    ${urlaubeRows || '<tr><td colspan="6" class="text-center text-muted">Keine Urlaube vorhanden</td></tr>'}
                  </tbody>
                </table>
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

    // Füge neues Modal hinzu
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Modal initialisieren
    const modalElement = document.querySelector('#urlaubeVerwaltungModal');
    const modal = new bootstrap.Modal(modalElement);

    // Event-Listener
    const tabelleBody = modalElement.querySelector('#urlaubeVerwaltungTabelleBody');

    tabelleBody.addEventListener('click', async (e) => {
      const bearbeitenBtn = e.target.closest('.btn-bearbeiten');
      const loeschenBtn = e.target.closest('.btn-loeschen');

      if (bearbeitenBtn) {
        const urlaubId = parseInt(bearbeitenBtn.dataset.id);
        modal.hide();

        await this.zeigeUrlaubBearbeiten(urlaubId, async () => {
          if (callback) await callback();
          setTimeout(() => this.zeigeUrlaubeVerwalten(mitarbeiterId, callback), 300);
        });
      } else if (loeschenBtn) {
        const urlaubId = parseInt(loeschenBtn.dataset.id);

        if (confirm('Möchten Sie diesen Urlaub wirklich löschen?')) {
          try {
            await this.dataManager.urlaubLoeschen(urlaubId);
            showNotification('Erfolg', 'Urlaub wurde gelöscht', 'success');
            modal.hide();
            if (callback) await callback();
            setTimeout(() => this.zeigeUrlaubeVerwalten(mitarbeiterId, callback), 300);
          } catch (error) {
            showNotification('Fehler', error.message, 'danger');
          }
        }
      }
    });

    // Modal anzeigen
    modal.show();

    // Cleanup nach Schließen
    modalElement.addEventListener('hidden.bs.modal', () => {
      modal.dispose();
      modalElement.remove();
    });
  }
}

// Export für Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UrlaubsDialog;
}