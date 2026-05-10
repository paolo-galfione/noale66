/**
 * noale66 — Logica pagina conferma presenza SAB 13 giugno
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKo7h5NdaLIMubmyVNwr3LimTXCgNwAXX7CfRDMtU6vmdUlsZwUO_kAwrDASjk9Q3v7g/exec';

document.addEventListener('DOMContentLoaded', () => {
  initFadeIn();
  document.getElementById('btnSi').addEventListener('click', () => conferma('si'));
  document.getElementById('btnNo').addEventListener('click', () => conferma('no'));
});

async function conferma(risposta) {
  const telefonoInput = document.getElementById('telefono');
  const messageEl = document.getElementById('confermaMessage');
  const telefono = telefonoInput.value.trim().replace(/[\s\-\.]/g, '');

  messageEl.className = 'form__message';
  messageEl.textContent = '';

  if (!telefono) {
    showMessage(messageEl, 'Inserisci il tuo numero di telefono.', 'error');
    telefonoInput.focus();
    return;
  }

  if (!/^(\+39)?3\d{8,9}$/.test(telefono) && !/^(\+39)?0\d{5,10}$/.test(telefono)) {
    showMessage(messageEl, 'Il numero non sembra valido. Inserisci un numero italiano (es. 333 1234567).', 'error');
    telefonoInput.focus();
    return;
  }

  setBtnsDisabled(true);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'confirm', telefono: telefono, risposta: risposta }),
      redirect: 'follow'
    });

    const result = await response.json();

    if (result.status === 'ok') {
      const primoNome = (result.nome || '').split(' ')[0] || result.nome;
      const testo = risposta === 'si'
        ? 'Perfetto ' + primoNome + '! Ti aspettiamo sabato 13 giugno al Parco di Villa Rossi dalle 18:30.'
        : 'Capito ' + primoNome + ', ci dispiace! Speriamo di rivederti in un\'altra occasione.';

      document.getElementById('confermaForm').style.display = 'none';
      document.getElementById('esitoTesto').textContent = testo;
      document.getElementById('confermaEsito').style.display = 'block';
    } else {
      const msg = result.message === 'Numero non trovato tra gli iscritti'
        ? 'Il numero inserito non risulta tra gli iscritti. Controlla di aver usato lo stesso numero con cui ti sei registrato, oppure iscriviti alla pagina principale.'
        : (result.message || 'Si e\' verificato un errore. Riprova.');
      showMessage(messageEl, msg, 'error');
    }
  } catch (err) {
    showMessage(messageEl, 'Errore di rete. Verifica la connessione e riprova.', 'error');
  } finally {
    setBtnsDisabled(false);
  }
}

function setBtnsDisabled(disabled) {
  document.getElementById('btnSi').disabled = disabled;
  document.getElementById('btnNo').disabled = disabled;
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form__message form__message--' + type;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

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
