/**
 * noale66 — Logica form di iscrizione
 *
 * CONFIGURAZIONE: Dopo aver deployato il Google Apps Script,
 * inserisci l'URL della web app qui sotto.
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKo7h5NdaLIMubmyVNwr3LimTXCgNwAXX7CfRDMtU6vmdUlsZwUO_kAwrDASjk9Q3v7g/exec';

document.addEventListener('DOMContentLoaded', () => {
  initFormSubmit();
  initFadeIn();
  initWhatsAppShare();
});

/* --- Invio del form --- */
function initFormSubmit() {
  const form = document.getElementById('registrationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const messageEl = document.getElementById('formMessage');

    // Reset messaggi
    messageEl.className = 'form__message';
    messageEl.textContent = '';

    // Validazione anti-bot
    const annoNascita = form.annoNascita.value.trim();
    if (annoNascita !== '1966') {
      showMessage(messageEl, 'Oops! L\'anno di nascita non è corretto. Questa cena è per i nati nel 1966!', 'error');
      return;
    }

    // Honeypot check
    if (form.website && form.website.value) {
      showMessage(messageEl, 'Grazie! La tua iscrizione è stata registrata.', 'success');
      return;
    }

    // Validazione campi obbligatori
    const nome = form.nome.value.trim();
    if (!nome) {
      showMessage(messageEl, 'Inserisci il tuo nome e cognome.', 'error');
      form.nome.focus();
      return;
    }

    // Validazione telefono (numeri italiani: almeno 9 cifre, opzionale +39)
    const telefono = form.telefono.value.trim().replace(/[\s\-\.]/g, '');
    if (!telefono) {
      showMessage(messageEl, 'Inserisci il tuo numero di telefono.', 'error');
      form.telefono.focus();
      return;
    }
    if (!/^(\+39)?3\d{8,9}$/.test(telefono) && !/^(\+39)?0\d{5,10}$/.test(telefono)) {
      showMessage(messageEl, 'Il numero di telefono non sembra valido. Inserisci un numero italiano (es. 333 1234567).', 'error');
      form.telefono.focus();
      return;
    }

    // Date selezionate (checkbox, possono essere multiple)
    const checkSab6 = form.querySelector('input[name="data"][value="SAB-6"]').checked;
    const checkDom7 = form.querySelector('input[name="data"][value="DOM-7"]').checked;
    const checkSab20 = form.querySelector('input[name="data"][value="SAB-20"]').checked;
    const checkDom21 = form.querySelector('input[name="data"][value="DOM-21"]').checked;
    if (!checkSab6 && !checkDom7 && !checkSab20 && !checkDom21) {
      showMessage(messageEl, 'Seleziona almeno una data in cui saresti disponibile.', 'error');
      return;
    }

    // Raccogli dati
    const data = {
      nome: nome,
      telefono: form.telefono.value.trim(),
      sab6: checkSab6,
      dom7: checkDom7,
      sab20: checkSab20,
      dom21: checkDom21,
      accompagnatore: form.querySelector('input[name="accompagnatore"]:checked')?.value || 'no',
      note: form.note.value.trim()
    };

    // Invio
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>Invio in corso...';

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data),
        redirect: 'follow'
      });

      // Verifica che la risposta HTTP sia ok
      if (!response.ok) {
        console.error('Errore HTTP:', response.status, response.statusText);
        showMessage(messageEl, 'Errore di comunicazione con il server (HTTP ' + response.status + '). Riprova o contattaci su WhatsApp.', 'error');
        return;
      }

      // Verifica che la risposta sia leggibile (non opaque)
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // Se non riesce a leggere il JSON, potrebbe essere una opaque response
        console.error('Risposta non leggibile dal server:', parseError);
        showMessage(messageEl, 'Non è stato possibile verificare la registrazione. Contattaci su WhatsApp per confermare.', 'error');
        return;
      }

      // Verifica il contenuto della risposta
      if (result.status === 'ok') {
        showMessage(messageEl, 'Grazie! La tua iscrizione è stata registrata. Ci vediamo alla cena!', 'success');
        form.reset();
      } else {
        console.error('Errore dal server:', result.message || 'sconosciuto');
        showMessage(messageEl, 'Si è verificato un errore: ' + (result.message || 'errore sconosciuto') + '. Riprova o contattaci su WhatsApp.', 'error');
      }

    } catch (error) {
      console.error('Errore invio form:', error);
      showMessage(messageEl, 'Errore di rete. Verifica la connessione e riprova, oppure contattaci su WhatsApp.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iscriviti alla cena';
    }
  });
}

/* --- Mostra messaggio di feedback --- */
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form__message form__message--' + type;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* --- Fade-in al scroll --- */
function initFadeIn() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => observer.observe(el));
}

/* --- Condivisione WhatsApp --- */
function initWhatsAppShare() {
  const shareBtn = document.getElementById('shareWhatsapp');
  if (!shareBtn) return;

  shareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const text = encodeURIComponent(
      'Ciao! Sei del \'66 e ami Noale? ' +
      'Festeggiamo i nostri 60 anni insieme con una cena a Villa Rossi! ' +
      'Iscriviti qui: https://noale66.it'
    );
    window.open('https://wa.me/?text=' + text, '_blank');
  });
}
