/**
 * noale66 — Google Apps Script
 *
 * ISTRUZIONI PER IL DEPLOY:
 * 1. Vai su https://script.google.com e crea un nuovo progetto
 * 2. Incolla questo codice nel file Code.gs
 * 3. Nella funzione setup(), modifica SPREADSHEET_ID con l'ID del tuo Google Sheet
 * 4. Esegui la funzione setup() una volta per creare le intestazioni
 * 5. Deploy > Nuova distribuzione > App web
 *    - Esegui come: "Il tuo account"
 *    - Chi ha accesso: "Chiunque"
 * 6. Copia l'URL della web app e incollalo in js/main.js (APPS_SCRIPT_URL)
 *    e in js/admin.js (APPS_SCRIPT_URL)
 *
 * ADMIN PASSWORD:
 * Cambia la password nella costante ADMIN_PASSWORD qui sotto.
 */

const SPREADSHEET_ID = '1qy8T7TJrmEYiWZkvfxbfYc5CjgKYqC0AK0YoTrY8-MM';
const SHEET_NAME = 'Iscrizioni';
const ADMIN_PASSWORD = 'noale66admin';

/**
 * Esegui questa funzione una volta per creare le intestazioni nel foglio.
 */
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.getRange(1, 1, 1, 10).setValues([[
    'Timestamp', 'Nome', 'Telefono', 'SAB-6',
    'DOM-7', 'SAB-20', 'DOM-21', 'Accompagnatore', 'Note', 'Conferma13giugno'
  ]]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
}

/**
 * Gestisce le richieste POST.
 * Azioni supportate:
 * - action: "register" (default) — nuova iscrizione
 * - action: "confirm" — conferma/disdetta per SAB 13 (pubblica, senza password)
 * - action: "delete" — elimina riga (richiede password + row)
 * - action: "update" — modifica riga (richiede password + row + fields)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'register';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    // --- Nuova iscrizione ---
    if (action === 'register') {
      sheet.appendRow([
        new Date().toLocaleString('it-IT'),
        data.nome || '',
        data.telefono || '',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        data.accompagnatore || 'no',
        data.note || '',
        'Si'
      ]);
      return jsonResponse({ status: 'ok' });
    }

    // --- Conferma presenza SAB 13 (pubblica, senza password) ---
    if (action === 'confirm') {
      const telefono = (data.telefono || '').replace(/[\s\-\.]/g, '');
      const risposta = data.risposta; // 'si' o 'no'

      if (!telefono || (risposta !== 'si' && risposta !== 'no')) {
        return jsonResponse({ status: 'error', message: 'Dati mancanti' });
      }

      const sheetData = sheet.getDataRange().getValues();

      function normTel(t) {
        t = String(t).replace(/[\s\-\.]/g, '');
        return t.replace(/^\+?39/, '');
      }

      const telNorm = normTel(telefono);
      let found = false;
      let nome = '';

      for (let i = 1; i < sheetData.length; i++) {
        if (normTel(sheetData[i][2]) === telNorm) {
          const confermaValue = risposta === 'si' ? 'Si' : 'No';
          sheet.getRange(i + 1, 10).setValue(confermaValue);
          found = true;
          nome = sheetData[i][1];
          break;
        }
      }

      if (!found) {
        return jsonResponse({ status: 'error', message: 'Numero non trovato tra gli iscritti' });
      }
      return jsonResponse({ status: 'ok', nome: nome });
    }

    // --- Azioni admin (richiedono password) ---
    if (data.password !== ADMIN_PASSWORD) {
      return jsonResponse({ status: 'error', message: 'Password non valida' });
    }

    // --- Elimina riga ---
    if (action === 'delete') {
      const row = data.row;
      if (!row || row < 2) {
        return jsonResponse({ status: 'error', message: 'Riga non valida' });
      }
      sheet.deleteRow(row);
      return jsonResponse({ status: 'ok' });
    }

    // --- Modifica riga ---
    if (action === 'update') {
      const row = data.row;
      if (!row || row < 2) {
        return jsonResponse({ status: 'error', message: 'Riga non valida' });
      }
      const fields = data.fields;
      const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];

      headers.forEach((h, i) => {
        if (h in fields) {
          sheet.getRange(row, i + 1).setValue(fields[h]);
        }
      });
      return jsonResponse({ status: 'ok' });
    }

    return jsonResponse({ status: 'error', message: 'Azione non riconosciuta' });

  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Gestisce le richieste GET (lettura dati per la dashboard admin).
 * Richiede il parametro ?password=ADMIN_PASSWORD
 */
function doGet(e) {
  // --- Verifica iscrizione pubblica (senza password) ---
  if (e.parameter.action === 'verify' && e.parameter.telefono) {
    const telefono = e.parameter.telefono.replace(/[\s\-\.]/g, '');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    function normTel(t) {
      t = String(t).replace(/[\s\-\.]/g, '');
      return t.replace(/^\+?39/, '');
    }

    const telNorm = normTel(telefono);
    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (normTel(data[i][2]) === telNorm) {
        found = true;
        break;
      }
    }

    return jsonResponse({ found: found });
  }

  // --- Dashboard admin (richiede password) ---
  const password = e.parameter.password;

  if (password !== ADMIN_PASSWORD) {
    return jsonResponse({ status: 'error', message: 'Password non valida' });
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    const headers = data[0];
    const rows = data.slice(1).map((row, index) => {
      const obj = { _row: index + 2 };
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    return jsonResponse({ status: 'ok', data: rows });

  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/** Helper per risposte JSON */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
