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
    const checkGiugno = form.querySelector('input[name="data"][value="27 giugno"]').checked;
    const checkSettembre = form.querySelector('input[name="data"][value="12 settembre"]').checked;
    if (!checkGiugno && !checkSettembre) {
      showMessage(messageEl, 'Seleziona almeno una data in cui saresti disponibile.', 'error');
      return;
    }

    // Raccogli dati
    const data = {
      nome: nome,
      telefono: form.telefono.value.trim(),
      giugno: checkGiugno,
      settembre: checkSettembre,
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
        body: JSON.stringify(data)
      });

      showMessage(messageEl, 'Grazie! La tua iscrizione è stata registrata. Ci vediamo alla cena!', 'success');
      form.reset();

    } catch (error) {
      showMessage(messageEl, 'Si è verificato un errore. Riprova tra qualche istante.', 'error');
      console.error('Errore invio form:', error);
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
