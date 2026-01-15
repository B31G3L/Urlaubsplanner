/**
 * Utility-Funktionen
 */

/**
 * Formatiert eine Zahl mit einer Dezimalstelle (deutsches Format mit Komma)
 * @param {number} zahl - Die zu formatierende Zahl
 * @returns {string} - Formatierte Zahl mit einer Dezimalstelle
 */
function formatZahl(zahl) {
  return zahl.toFixed(1).replace('.', ',');
}
