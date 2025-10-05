// ====== Calendario robusto (6x7 fijo, selección, teclado, evento) ======
(function () {
  const container = document.querySelector('.calendar-container');
  if (!container) return;

  const elTitle   = container.querySelector('.calendar-current-date');
  const elDates   = container.querySelector('.calendar-dates');
  const btnPrev   = container.querySelector('#calendar-prev');
  const btnNext   = container.querySelector('#calendar-next');

  // --- Config ---
  const WEEK_START = 0; // 0=Domingo, 1=Lunes
  const LOCALE = 'es-ES';

  // Estado
  let view = new Date();      // mes en vista
  view.setDate(1);
  let selected = null;        // {y,m,d} o null

  // Utiles
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const sameYMD = (y, m, d, dt) => (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d);
  const monthLabel = (y, m) => {
    const name = new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(new Date(y, m, 1));
    return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
  };

  // Corrige getDay() según WEEK_START
  const dayIndex = (date) => {
    const raw = date.getDay();           // 0..6 (Domingo..Sábado)
    return (raw - WEEK_START + 7) % 7;   // reindexado con semana empezando en WEEK_START
  };

  function render() {
    const Y = view.getFullYear();
    const M = view.getMonth();

    elTitle.textContent = monthLabel(Y, M);

    // --- Calcular rejilla 6x7 ---
    // 1) ¿cuántos días del mes anterior para llenar el inicio?
    const firstDayOfMonth = new Date(Y, M, 1);
    const daysPrev = dayIndex(firstDayOfMonth);       // 0..6
    // 2) días del mes actual
    const daysInMonth = new Date(Y, M + 1, 0).getDate();
    // 3) ¿cuántos del mes siguiente para completar 42?
    let total = daysPrev + daysInMonth;
    let daysNext = (7 - (total % 7)) % 7;
    total += daysNext;
    if (total < 42) {
      daysNext += (42 - total); // fuerza 6 filas
    }

    const items = [];
    const today = new Date();

    // --- Mes anterior (inactivos) ---
    const daysInPrevMonth = new Date(Y, M, 0).getDate();
    for (let i = daysPrev; i > 0; i--) {
      const d = daysInPrevMonth - i + 1;
      items.push(`<li class="inactive" aria-disabled="true">${d}</li>`);
    }

    // --- Mes actual ---
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = sameYMD(Y, M, d, today);
      const isSelected = selected && selected.y === Y && selected.m === M && selected.d === d;

      const classes = [
        isToday ? 'active' : '',
        isSelected ? 'highlight' : ''
      ].join(' ').trim();

      items.push(
        `<li class="${classes}" data-day="${d}" tabindex="0" role="button" aria-pressed="${isSelected}">
          ${d}
        </li>`
      );
    }

    // --- Mes siguiente (inactivos) ---
    for (let d = 1; d <= daysNext; d++) {
      items.push(`<li class="inactive" aria-disabled="true">${d}</li>`);
    }

    elDates.innerHTML = items.join('');

    // --- Click / teclado en días del mes actual ---
    elDates.querySelectorAll('li[data-day]').forEach((li) => {
      li.addEventListener('click', () => choose(+li.dataset.day));
      li.addEventListener('keydown', (ev) => {
        const key = ev.key;
        if (key === 'Enter') { choose(+li.dataset.day); return; }
        // Navegación con flechas
        const step = (dx) => moveFocus(li, dx);
        if (key === 'ArrowLeft')  step(-1);
        if (key === 'ArrowRight') step(+1);
        if (key === 'ArrowUp')    step(-7);
        if (key === 'ArrowDown')  step(+7);
      });
    });
  }

  // Selección de día
  function choose(d) {
    const y = view.getFullYear();
    const m = view.getMonth();
    selected = { y, m, d };
    render();
    const iso = toISO(y, m, d);
    container.dispatchEvent(new CustomEvent('calendar:dateSelected', {
      detail: { year: y, month: m, day: d, iso }
    }));
  }

  // Mover foco dentro de la grilla (sin romper 6x7)
  function moveFocus(fromLi, delta) {
    const cells = Array.from(elDates.querySelectorAll('li'));
    const idx = cells.indexOf(fromLi);
    const j = Math.max(0, Math.min(cells.length - 1, idx + delta));
    const target = cells[j];
    if (target?.hasAttribute('data-day')) {
      target.focus();
    } else {
      // si cae en inactivo y el movimiento fue lateral, tratamos de saltar al siguiente activo
      const dir = Math.sign(delta) || 1;
      let k = j;
      while (k >= 0 && k < cells.length) {
        if (cells[k].hasAttribute('data-day')) { cells[k].focus(); break; }
        k += dir;
      }
    }
  }

  // Botones prev / next
  btnPrev?.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  btnNext?.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });

  // Inicial
  render();

  // Ejemplo de escucha externa:
  // container.addEventListener('calendar:dateSelected', e => console.log(e.detail.iso));
})();
