// ========= MAPA =========
    console.log('Leaflet version:', L && L.version);

    // Crear mapa centrado en el mundo
    const map = L.map('map').setView([0, 0], 2);

    // Capa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
	   attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Variable global para el marcador
    let marker;

    // Evento: clic en el mapa
    map.on('click', (e) => {
      const lat = +e.latlng.lat.toFixed(6);
      const lon = +e.latlng.lng.toFixed(6);
        const input_latitud= document.getElementById('id_input_latitud');
        input_latitud.value=lat;
        const input_longitud= document.getElementById('id_input_longitud');
        input_longitud.value=lon;

      if (marker) marker.setLatLng(e.latlng);
      else marker = L.marker(e.latlng).addTo(map);

      marker.bindPopup(`Lat: ${lat}<br>Lon: ${lon}`).openPopup();
      updatePredictor(lat, lon); // <-- actualiza el panel sin mapa
    });

    // ========= PREDICTOR (NASA POWER) =========
    // ========== DATOS PARA EL FRONTEND=========
    const el = {
      date:  document.getElementById('p-date'),
      coord: document.getElementById('p-coord'),
      t2m:   document.getElementById('p-t2m'),
      t2mmax:document.getElementById('p-t2mmax'),
      t2mmin:document.getElementById('p-t2mmin'),
      prec:  document.getElementById('p-prec'),
      wind:  document.getElementById('p-wind'),
      pres:  document.getElementById('p-pres'),
      r_h2m: document.getElementById('p-r_h2m'),
      status:document.getElementById('p-status')

    };

    const fmtYYYYMMDD = d => {
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      return `${y}${m}${dd}`;
    };
    //TEMPERATURA
    function lastNDaysRange(){ // n=10 más días para evitar -999
      const today=new Date();
      const end=new Date(today);  end.setDate(end.getDate()-3); //hace 3 dias
      const start=new Date(today); start.setDate(start.getDate()-13); //hace 3 dias + 10 dias
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

      const { start, end } = lastNDaysRange(10); // muestrame los 10 dias
      //============ URL API NASA ===============//
      //tmedia, tmaxima, tminima, precipitacion, viento, presion, humedadRel
      const params = ['T2M','T2M_MAX','T2M_MIN','PRECTOT','WS10M','PS','RH2M'].join(',');
      const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
      url.search = new URLSearchParams({
        parameters: params, community: 'ag',
        longitude: lon, latitude: lat,
        start, end, format: 'JSON'
      });
    
      console.log(url);

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

        const T2M     = safeNum(param.T2M?.[latest]); //TMEDIA
        const T2M_MAX = safeNum(param.T2M_MAX?.[latest]); //TMAXIMA
        const T2M_MIN = safeNum(param.T2M_MIN?.[latest]); //TMINIMA
        const PREC    = safeNum(param.PRECTOTCORR?.[latest]); //PRECIPITACION
        const WIND    = safeNum(param.WS10M?.[latest]); //VIENTO
        const PRES    = safeNum(param.PS?.[latest]); //PRESION
        const R_H2M   = safeNum(param.RH2M?.[latest]); //HUMEDAD RELATIVA

        //devuelve los datos
        el.date.textContent = iso;
        el.t2m.textContent   = T2M     != null ? `${T2M.toFixed(1)} °C`     : '—';
        el.t2mmax.textContent= T2M_MAX != null ? `${T2M_MAX.toFixed(1)} °C` : '—';
        el.t2mmin.textContent= T2M_MIN != null ? `${T2M_MIN.toFixed(1)} °C` : '—';
        el.prec.textContent  = PREC    != null ? `${PREC.toFixed(1)} mm/día`: '—';
        el.wind.textContent  = WIND    != null ? `${WIND.toFixed(1)} m/s`    : '—';
        el.pres.textContent  = PRES    != null ? `${PRES.toFixed(1)} kPa`    : '—';
        el.r_h2m.textContent = R_H2M   != null ? `${R_H2M.toFixed(1)} %`      : '—';


        setStatus(`Datos de ${iso}.`, false);
      }catch(err){
        console.error(err);
        setStatus('No se pudieron obtener datos (CORS/red o sin cobertura).', false);
      }
    }