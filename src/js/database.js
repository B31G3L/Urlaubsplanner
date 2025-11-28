/**
 * Teamplanner Database Layer (Renderer)
 * IPC Wrapper für Datenbank-Kommunikation mit Main Process
 */

class TeamplannerDatabase {
  constructor() {
    if (!window.electronAPI || !window.electronAPI.db) {
      throw new Error('Electron API nicht verfügbar! Stelle sicher, dass preload.js geladen wurde.');
    }

    this.api = window.electronAPI.db;
    console.log('✅ Database Wrapper initialisiert');
  }

  /**
   * Führt Query aus und gibt alle Ergebnisse zurück
   */
  async query(sql, params = []) {
    const result = await this.api.query(sql, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Führt Query aus und gibt erstes Ergebnis zurück
   */
  async get(sql, params = []) {
    const result = await this.api.get(sql, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Führt INSERT/UPDATE/DELETE aus
   */
  async run(sql, params = []) {
    const result = await this.api.run(sql, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * Führt mehrere SQL-Statements aus (kein Prepared Statement)
   */
  async exec(sql) {
    const result = await this.api.exec(sql);
    if (!result.success) {
      throw new Error(result.error);
    }
    return true;
  }

  /**
   * Gibt Datenbank-Informationen zurück
   */
  async getDatabaseInfo() {
    const tables = {
      mitarbeiter: (await this.get('SELECT COUNT(*) as count FROM mitarbeiter')).count,
      abteilungen: (await this.get('SELECT COUNT(*) as count FROM abteilungen')).count,
      urlaub: (await this.get('SELECT COUNT(*) as count FROM urlaub')).count,
      krankheit: (await this.get('SELECT COUNT(*) as count FROM krankheit')).count,
      schulung: (await this.get('SELECT COUNT(*) as count FROM schulung')).count,
      ueberstunden: (await this.get('SELECT COUNT(*) as count FROM ueberstunden')).count,
      feiertage: (await this.get('SELECT COUNT(*) as count FROM feiertage')).count,
      veranstaltungen: (await this.get('SELECT COUNT(*) as count FROM veranstaltungen')).count
    };

    return {
      path: 'userData/teamplanner_v3.db',
      tables
    };
  }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamplannerDatabase;
}