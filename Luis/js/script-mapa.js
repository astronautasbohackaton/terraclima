// ========= MAPA =========
    console.log('Leaflet version:', L && L.version);
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker; // único pin

    map.on('click', (e) => {
      const lat = +e.latlng.lat.toFixed(6);
      const lon = +e.latlng.lng.toFixed(6);

      if (marker) marker.setLatLng(e.latlng);
      else marker = L.marker(e.latlng).addTo(map);

      marker.bindPopup(`Lat: ${lat}<br>Lon: ${lon}`).openPopup();
      updatePredictor(lat, lon); // <-- actualiza el panel sin mapa
    });

    // ========= PREDICTOR (NASA POWER) =========
    const el = {
      date:  document.getElementById('p-date'),
      coord: document.getElementById('p-coord'),
      t2m:   document.getElementById('p-t2m'),
      t2mmax:document.getElementById('p-t2mmax'),
      t2mmin:document.getElementById('p-t2mmin'),
      prec:  document.getElementById('p-prec'),
      wind:  document.getElementById('p-wind'),
      status:document.getElementById('p-status')
    };

    const fmtYYYYMMDD = d => {
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      return `${y}${m}${dd}`;
    };
    function lastNDaysRange(n=15){ // más días para evitar -999
      const today=new Date();
      const end=new Date(today);  end.setDate(end.getDate()-1);
      const start=new Date(today); start.setDate(start.getDate()-n);
      return { start: fmtYYYYMMDD(start), end: fmtYYYYMMDD(end) };
    }
    const isoFromYYYYMMDD = s => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    const safeNum = v => Number.isFinite(+v) ? +v : null;

    function setStatus(msg, loading=false){
      el.status.textContent = msg;
      el.status.classList.toggle('loading', loading);
    }
    function clearVals(){
      el.t2m.textContent = el.t2mmax.textContent = el.t2mmin.textContent =
      el.prec.textContent = el.wind.textContent = '—';
      el.date.textContent = '—';
    }

    async function updatePredictor(lat, lon){
      el.coord.textContent = `Ubicación: ${lat}, ${lon}`;
      setStatus('Consultando NASA POWER…', true);
      clearVals();

      const { start, end } = lastNDaysRange(15);
      const params = ['T2M','T2M_MAX','T2M_MIN','PRECTOTCORR','WS10M'].join(',');
      const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
      url.search = new URLSearchParams({
        parameters: params, community: 'ag',
        longitude: lon, latitude: lat,
        start, end, format: 'JSON'
      });

      try{
        const r = await fetch(url, { mode: 'cors' });
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const param = data?.properties?.parameter || {};

        // Buscar la fecha válida más reciente (evitar -999)
        const dates = new Set();
        Object.values(param).forEach(obj => { if(obj) for(const d in obj) dates.add(d); });
        const valid = [...dates].filter(d => {
          const t = param.T2M?.[d];
          return t != null && t > -900; // descarta códigos -999
        });
        if(!valid.length) throw new Error('Sin datos válidos recientes en este punto.');

        const latest = valid.sort().pop();
        const iso = isoFromYYYYMMDD(latest);

        const T2M     = safeNum(param.T2M?.[latest]);
        const T2M_MAX = safeNum(param.T2M_MAX?.[latest]);
        const T2M_MIN = safeNum(param.T2M_MIN?.[latest]);
        const PREC    = safeNum(param.PRECTOTCORR?.[latest]);
        const WIND    = safeNum(param.WS10M?.[latest]);

        el.date.textContent = iso;
        el.t2m.textContent   = T2M     != null ? `${T2M.toFixed(1)} °C`     : '—';
        el.t2mmax.textContent= T2M_MAX != null ? `${T2M_MAX.toFixed(1)} °C` : '—';
        el.t2mmin.textContent= T2M_MIN != null ? `${T2M_MIN.toFixed(1)} °C` : '—';
        el.prec.textContent  = PREC    != null ? `${PREC.toFixed(1)} mm/día`: '—';
        el.wind.textContent  = WIND    != null ? `${WIND.toFixed(1)} m/s`    : '—';

        setStatus(`Datos de ${iso}.`, false);
      }catch(err){
        console.error(err);
        setStatus('No se pudieron obtener datos (CORS/red o sin cobertura).', false);
      }
    }