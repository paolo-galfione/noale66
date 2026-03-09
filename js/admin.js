/**
 * noale66 — Dashboard Admin
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKo7h5NdaLIMubmyVNwr3LimTXCgNwAXX7CfRDMtU6vmdUlsZwUO_kAwrDASjk9Q3v7g/exec';

let currentData = [];

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initRefresh();
  initExportCsv();
  initLogout();

  // Auto-login se c'è un cookie salvato
  const savedPwd = getCookie('adminPwd');
  if (savedPwd) {
    loadData(savedPwd);
  }
});

/* --- Cookie helpers --- */
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Strict';
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name) {
  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
}

/* --- Login --- */
function initLogin() {
  const loginBtn = document.getElementById('loginBtn');
  const passwordInput = document.getElementById('adminPassword');

  function doLogin() {
    const password = passwordInput.value.trim();
    if (!password) {
      showLoginMessage('Inserisci la password.', 'error');
      return;
    }
    setCookie('adminPwd', password, 30); // salva per 30 giorni
    loadData(password);
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
}

/* --- Logout --- */
function initLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    deleteCookie('adminPwd');
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
  });
}

function showLoginMessage(text, type) {
  const el = document.getElementById('loginMessage');
  el.textContent = text;
  el.className = 'form__message form__message--' + type;
}

/* --- Caricamento dati --- */
async function loadData(password) {
  password = password || getCookie('adminPwd');
  if (!password) return;

  try {
    const url = APPS_SCRIPT_URL + '?password=' + encodeURIComponent(password);
    const response = await fetch(url);
    const result = await response.json();

    if (result.status === 'error') {
      showLoginMessage(result.message || 'Accesso negato.', 'error');
      deleteCookie('adminPwd');
      return;
    }

    currentData = result.data || [];

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';

    renderStats(currentData);
    renderTable(currentData);

  } catch (error) {
    showLoginMessage('Errore di connessione. Riprova.', 'error');
    console.error('Errore caricamento dati:', error);
  }
}

/* --- Helper per POST admin --- */
async function adminPost(payload) {
  const password = getCookie('adminPwd');
  payload.password = password;
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

/* --- Statistiche --- */
function renderStats(data) {
  const totale = data.length;
  let accompagnatori = 0;
  let giugno = 0;
  let settembre = 0;
  let entrambe = 0;

  data.forEach(row => {
    if (isSi(row['Accompagnatore'])) {
      accompagnatori++;
    }
    const isGiugno = isSi(row['Disp. Giugno']);
    const isSettembre = isSi(row['Disp. Settembre']);
    if (isGiugno) giugno++;
    if (isSettembre) settembre++;
    if (isGiugno && isSettembre) entrambe++;
  });

  document.getElementById('statTotale').textContent = totale;
  document.getElementById('statAccompagnatori').textContent = accompagnatori;
  document.getElementById('statGiugno').textContent = giugno;
  document.getElementById('statSettembre').textContent = settembre;
  document.getElementById('statEntrambe').textContent = entrambe;
}

/* --- Tabella --- */
function renderTable(data) {
  const tbody = document.getElementById('tableBody');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px;">Nessuna iscrizione trovata.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((row, i) => {
    const nome = escapeHtml(String(row['Nome'] || ''));
    const nomeAttr = escapeAttr(String(row['Nome'] || ''));
    return `
    <tr data-row="${row._row}">
      <td>${i + 1}</td>
      <td>${escapeHtml(String(row['Timestamp'] || ''))}</td>
      <td>${nome}</td>
      <td>${escapeHtml(String(row['Telefono'] || ''))}</td>
      <td>${isSi(row['Disp. Giugno']) ? 'Sì' : 'No'}</td>
      <td>${isSi(row['Disp. Settembre']) ? 'Sì' : 'No'}</td>
      <td>${isSi(row['Accompagnatore']) ? 'Sì' : 'No'}</td>
      <td>${escapeHtml(String(row['Note'] || ''))}</td>
      <td class="admin-actions">
        <button class="btn-icon btn-icon--edit" title="Modifica" onclick="editRow(${row._row}, ${i})">&#9998;</button>
        <button class="btn-icon btn-icon--delete" title="Elimina" onclick="deleteRow(${row._row}, '${nomeAttr}')">&#10005;</button>
      </td>
    </tr>`;
  }).join('');
}

/* --- Elimina riga --- */
async function deleteRow(sheetRow, nome) {
  if (!confirm('Vuoi eliminare l\'iscrizione di "' + nome + '"?')) return;

  try {
    const result = await adminPost({ action: 'delete', row: sheetRow });
    if (result.status === 'error') {
      alert('Errore: ' + result.message);
    } else {
      await loadData();
    }
  } catch (error) {
    alert('Errore durante l\'eliminazione. Riprova.');
    console.error(error);
  }
}

/* --- Modifica riga --- */
function editRow(sheetRow, dataIndex) {
  const row = currentData[dataIndex];
  if (!row) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="modal__title">Modifica iscrizione</h2>
      <div class="form__group">
        <label class="form__label">Nome</label>
        <input class="form__input" type="text" id="editNome" value="${escapeAttr(String(row['Nome'] || ''))}">
      </div>
      <div class="form__group">
        <label class="form__label">Telefono</label>
        <input class="form__input" type="tel" id="editTelefono" value="${escapeAttr(String(row['Telefono'] || ''))}">
      </div>
      <div class="form__group">
        <label class="form__label">27 Giugno</label>
        <select class="form__input" id="editGiugno">
          <option value="Sì" ${isSi(row['Disp. Giugno']) ? 'selected' : ''}>Sì</option>
          <option value="No" ${!isSi(row['Disp. Giugno']) ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form__group">
        <label class="form__label">12 Settembre</label>
        <select class="form__input" id="editSettembre">
          <option value="Sì" ${isSi(row['Disp. Settembre']) ? 'selected' : ''}>Sì</option>
          <option value="No" ${!isSi(row['Disp. Settembre']) ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form__group">
        <label class="form__label">Accompagnatore</label>
        <select class="form__input" id="editAccompagnatore">
          <option value="si" ${isSi(row['Accompagnatore']) ? 'selected' : ''}>Sì</option>
          <option value="no" ${!isSi(row['Accompagnatore']) ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form__group">
        <label class="form__label">Note</label>
        <textarea class="form__textarea" id="editNote">${escapeHtml(String(row['Note'] || ''))}</textarea>
      </div>
      <div class="modal__buttons">
        <button class="btn btn--primary" id="editSaveBtn">Salva</button>
        <button class="btn btn--outline" id="editCancelBtn">Annulla</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('editCancelBtn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('editSaveBtn').addEventListener('click', async () => {
    const saveBtn = document.getElementById('editSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvataggio...';

    const fields = {
      'Nome': document.getElementById('editNome').value.trim(),
      'Telefono': document.getElementById('editTelefono').value.trim(),
      'Disp. Giugno': document.getElementById('editGiugno').value,
      'Disp. Settembre': document.getElementById('editSettembre').value,
      'Accompagnatore': document.getElementById('editAccompagnatore').value,
      'Note': document.getElementById('editNote').value.trim()
    };

    try {
      const result = await adminPost({ action: 'update', row: sheetRow, fields: fields });
      if (result.status === 'error') {
        alert('Errore: ' + result.message);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salva';
      } else {
        overlay.remove();
        await loadData();
      }
    } catch (error) {
      alert('Errore durante il salvataggio. Riprova.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salva';
      console.error(error);
    }
  });
}

/* --- Aggiorna --- */
function initRefresh() {
  document.getElementById('refreshBtn')?.addEventListener('click', () => loadData());
}

/* --- Esporta CSV --- */
function initExportCsv() {
  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (!currentData.length) return;

    const headers = ['Timestamp', 'Nome', 'Telefono', 'Disp. Giugno', 'Disp. Settembre', 'Accompagnatore', 'Note'];
    const csvRows = [headers.join(';')];

    currentData.forEach(row => {
      const values = headers.map(h => {
        const val = String(row[h] || '').replace(/"/g, '""');
        return '"' + val + '"';
      });
      csvRows.push(values.join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'iscrizioni_noale66.csv';
    link.click();
    URL.revokeObjectURL(url);
  });
}

/* --- Utility --- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

/** Controlla se un valore è "sì"/"si"/"Sì"/"Si" */
function isSi(val) {
  const v = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return v === 'si';
}
