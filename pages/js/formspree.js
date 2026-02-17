const form = document.getElementById('contactForm');
const msg = document.getElementById('formMessage');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Seite nicht neu laden
    const formData = new FormData(form);

    try {
      const res = await fetch('https://formspree.io/f/mvzbzvqy', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        msg.style.display = 'block';  // zeigt „Sent!“
        form.reset();                  // Formular leeren
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
      } else {
        alert('Fehler beim Senden, bitte prüfen Sie Ihre Eingaben.');
      }
    } catch (err) {
      alert('Fehler beim Senden, bitte erneut versuchen.');
    }
  });
}
