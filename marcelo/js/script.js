// ====== Calendario básico (prev/next, hoy, inactivos, selección) ======
(function(){
  const container = document.querySelector('.calendar-container');
  if (!container) return;

  const currentEl = container.querySelector('.calendar-current-date');
  const datesEl   = container.querySelector('.calendar-dates');
  const prevBtn   = container.querySelector('#calendar-prev');
  const nextBtn   = container.querySelector('#calendar-next');

  // Estado interno (mes/año actuales mostrados)
  let viewDate = new Date();
  viewDate.setDate(1); // primer día del mes

  // Día seleccionado (opcional)
  let selected = null; // { y:2025, m:9, d:4 } por ejemplo

  function render(){
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-11

    // Título "Mes Año"
    const monthName = viewDate.toLocaleString('es-ES', { month: 'long' });
    currentEl.textContent = `${capitalize(monthName)} ${year}`;

    // Cálculos de calendario
    const firstDayIndex = new Date(year, month, 1).getDay();           // 0=Domingo
    const lastDate      = new Date(year, month+1, 0).getDate();        // días del mes actual
    const prevLastDate  = new Date(year, month, 0).getDate();          // días del mes anterior
    const lastDayIndex  = new Date(year, month, lastDate).getDay();

    // Construye celdas (li)
    const items = [];

    // Días previos (inactivos)
    for (let i = firstDayIndex; i > 0; i--){
      items.push(`<li class="inactive">${prevLastDate - i + 1}</li>`);
    }

    // Días del mes actual
    const today = new Date();
    const isTodayMonth = (today.getFullYear()===year && today.getMonth()===month);

    for (let d = 1; d <= lastDate; d++){
      const active  = isTodayMonth && d===today.getDate() ? 'active' : '';
      const hl      = (selected && selected.y===year && selected.m===month && selected.d===d) ? 'highlight' : '';
      items.push(`<li class="${active} ${hl}" data-day="${d}">${d}</li>`);
    }

    // Días del siguiente mes (para completar la cuadrícula)
    for (let i = lastDayIndex; i < 6; i++){
      items.push(`<li class="inactive">${i - lastDayIndex + 1}</li>`);
    }

    datesEl.innerHTML = items.join('');

    // Click en días del mes actual → selección
    datesEl.querySelectorAll('li[data-day]').forEach(li=>{
      li.addEventListener('click', ()=>{
        const day = +li.dataset.day;
        selected = { y:year, m:month, d:day };
        // Re-render para aplicar .highlight
        render();

        // Si quieres, emite un evento custom con la fecha seleccionada:
        const evt = new CustomEvent('calendar:dateSelected', {
          detail: { year, month, day, iso: toISO(year, month, day) }
        });
        container.dispatchEvent(evt);
      });
    });
  }

  prevBtn?.addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()-1); render(); });
  nextBtn?.addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()+1); render(); });

  // Utilidades
  function toISO(y, m, d){
    const mm = String(m+1).padStart(2,'0');
    const dd = String(d).padStart(2,'0');
    return `${y}-${mm}-${dd}`;
  }
  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  // Inicial
  render();

  // Ejemplo: escucha la fecha seleccionada (si quieres usarla)
  container.addEventListener('calendar:dateSelected', (e)=>{
    // console.log('Fecha elegida:', e.detail);
    // Aquí podrías usar e.detail.iso para consultar tu API/POWER según el día.
  });
})();
