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
let chartInstance = null;

// ========= ELEMENTOS DEL DOM =========
const el = {
  // Panel de datos actuales
  date:  document.getElementById('p-date'),
  coord: document.getElementById('p-coord'),
  t2m:   document.getElementById('p-t2m'),
  t2mmax:document.getElementById('p-t2mmax'),
  t2mmin:document.getElementById('p-t2mmin'),
  prec:  document.getElementById('p-prec'),
  wind:  document.getElementById('p-wind'),
  pres:  document.getElementById('p-pres'),
  r_h2m: document.getElementById('p-r_h2m'),
  status:document.getElementById('p-status'),
  
  // Panel de predicción
  datea: document.getElementById('p-datea'),
  t2ma:  document.getElementById('p-t2ma'),
  statusa:document.getElementById('p-statusa')
};

// ========= FUNCIONES AUXILIARES =========
const fmtYYYYMMDD = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
};

const isoFromYYYYMMDD = s => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
const safeNum = v => Number.isFinite(+v) ? +v : null;

function lastNDaysRange(n = 10) {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - 3);
  const start = new Date(today);
  start.setDate(start.getDate() - (3 + n));
  return { start: fmtYYYYMMDD(start), end: fmtYYYYMMDD(end) };
}

function lastNDaysRangePrediction() {
  const today = new Date();
  const end = fmtYYYYMMDD(today);
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  return { start: fmtYYYYMMDD(start), end };
}

// ========= FUNCIONES DE ESTADO =========
function setStatus(msg, loading = false) {
  if (el.status) {
    el.status.textContent = msg;
    el.status.classList.toggle('loading', loading);
  }
}

function setStatusPrediction(msg) {
  if (el.statusa) {
    el.statusa.textContent = msg;
  }
}

function clearVals() {
  if (el.t2m) el.t2m.textContent = '—';
  if (el.t2mmax) el.t2mmax.textContent = '—';
  if (el.t2mmin) el.t2mmin.textContent = '—';
  if (el.prec) el.prec.textContent = '—';
  if (el.wind) el.wind.textContent = '—';
  if (el.pres) el.pres.textContent = '—';
  if (el.r_h2m) el.r_h2m.textContent = '—';
  if (el.date) el.date.textContent = '—';
}

function clearValsPrediction() {
  if (el.t2ma) el.t2ma.textContent = '—';
  if (el.datea) el.datea.textContent = '—';
}

// ========= FUNCIONES DE PREDICCIÓN =========
function linearRegression(y) {
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - a * sumX) / n;
  return { a, b };
}

function predictTemperatures(baseTemps, daysAhead) {
  let forecast = [];
  let data = [...baseTemps];
  const avgTemp = baseTemps.reduce((a, b) => a + b, 0) / baseTemps.length;
  const maxTemp = Math.max(...baseTemps);
  const minTemp = Math.min(...baseTemps);
  const tempRange = maxTemp - minTemp;

  for (let i = 0; i < daysAhead; i++) {
    const { a, b } = linearRegression(data);
    let next = a * (data.length + 1) + b;
    next += Math.sin(i * 1.1) * (tempRange * 0.18);
    next += Math.cos(i * 0.85) * (tempRange * 0.14);
    next += Math.sin(i * 0.75) * (tempRange * 0.10);
    const deviation = next - avgTemp;
    if (Math.abs(deviation) > tempRange * 0.9) {
      next = avgTemp + (deviation > 0 ? tempRange * 0.9 : -tempRange * 0.9);
    }
    forecast.push(next);
    data.push(next);
  }
  return forecast;
}

// ========= ACTUALIZAR DATOS ACTUALES =========
async function updateCurrentData(lat, lon) {
  if (el.coord) el.coord.textContent = `Ubicación: ${lat}, ${lon}`;
  setStatus('Consultando NASA POWER…', true);
  clearVals();

  const input_fecha_format = document.getElementById('id_input_fecha_format');
  const fechaInicioStart = input_fecha_format ? input_fecha_format.value : fmtYYYYMMDD(new Date());

  const params = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'WS10M', 'PS', 'RH2M'].join(',');
  const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  url.search = new URLSearchParams({
    parameters: params,
    community: 'ag',
    longitude: lon,
    latitude: lat,
    start: fechaInicioStart,
    end: fechaInicioStart,
    format: 'JSON'
  });

  console.log('URL datos actuales:', url.toString());

  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const param = data?.properties?.parameter || {};

    const dates = new Set();
    Object.values(param).forEach(obj => {
      if (obj) for (const d in obj) dates.add(d);
    });
    const valid = [...dates].filter(d => {
      const t = param.T2M?.[d];
      return t != null && t > -900;
    });
    if (!valid.length) throw new Error('Sin datos válidos recientes en este punto.');

    const latest = valid.sort().pop();
    const iso = isoFromYYYYMMDD(latest);

    const T2M = safeNum(param.T2M?.[latest]);
    const T2M_MAX = safeNum(param.T2M_MAX?.[latest]);
    const T2M_MIN = safeNum(param.T2M_MIN?.[latest]);
    const PREC = safeNum(param.PRECTOTCORR?.[latest]);
    const WIND = safeNum(param.WS10M?.[latest]);
    const PRES = safeNum(param.PS?.[latest]);
    const R_H2M = safeNum(param.RH2M?.[latest]);

    if (el.date) el.date.textContent = iso;
    if (el.t2m) el.t2m.textContent = T2M != null ? `${T2M.toFixed(1)} °C` : '—';
    if (el.t2mmax) el.t2mmax.textContent = T2M_MAX != null ? `${T2M_MAX.toFixed(1)} °C` : '—';
    if (el.t2mmin) el.t2mmin.textContent = T2M_MIN != null ? `${T2M_MIN.toFixed(1)} °C` : '—';
    if (el.prec) el.prec.textContent = PREC != null ? `${PREC.toFixed(1)} mm/día` : '—';
    if (el.wind) el.wind.textContent = WIND != null ? `${WIND.toFixed(1)} m/s` : '—';
    if (el.pres) el.pres.textContent = PRES != null ? `${PRES.toFixed(1)} kPa` : '—';
    if (el.r_h2m) el.r_h2m.textContent = R_H2M != null ? `${R_H2M.toFixed(1)} %` : '—';

    setStatus(`Datos de ${iso}.`, false);
  } catch (err) {
    console.error(err);
    setStatus('No se pudieron obtener datos (CORS/red o sin cobertura).', false);
  }
}

// ========= ACTUALIZAR PREDICCIÓN =========
async function updatePrediction(lat, lon) {
  setStatusPrediction('Consultando NASA POWER…');
  clearValsPrediction();

  const { start, end } = lastNDaysRangePrediction();
  const params = ['T2M'].join(',');
  const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  url.search = new URLSearchParams({
    parameters: params,
    community: 'AG',
    longitude: lon,
    latitude: lat,
    start,
    end,
    format: 'JSON'
  });

  console.log('URL predicción:', url.toString());

  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const param = data?.properties?.parameter || {};

    const dates = Object.keys(param.T2M || {});
    const validDates = dates.filter(d => safeNum(param.T2M[d]) !== null && param.T2M[d] > -900).sort();
    if (!validDates.length) throw new Error('Sin datos recientes.');

    const historicalTemps = validDates.map(d => safeNum(param.T2M[d]));
    const predicted = predictTemperatures(historicalTemps, 6);
    const forecastDates = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const next = new Date(today.getTime() + i * 86400000);
      forecastDates.push(isoFromYYYYMMDD(fmtYYYYMMDD(next)));
    }

    if (el.datea) el.datea.textContent = forecastDates[0];
    if (el.t2ma) el.t2ma.textContent = predicted[0].toFixed(1) + ' °C';
    setStatusPrediction(`Predicción desde ${forecastDates[0]}`);

    // Graficar Chart.js
    const chartCanvas = document.getElementById('tempChart');
    if (chartCanvas) {
      const ctx = chartCanvas.getContext('2d');
      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: forecastDates,
          datasets: [{
            label: 'Temperatura Media (°C)',
            data: predicted,
            borderColor: 'rgb(34,123,255)',
            backgroundColor: 'rgba(34,123,255,0.2)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: { y: { beginAtZero: false } }
        }
      });
    }
  } catch (err) {
    console.error(err);
    setStatusPrediction('Error obteniendo datos de predicción.');
  }
}

// ========= EVENTO: CLIC EN EL MAPA =========
map.on('click', (e) => {
  const lat = +e.latlng.lat.toFixed(6);
  const lon = +e.latlng.lng.toFixed(6);

  // Actualizar inputs si existen
  const input_latitud = document.getElementById('id_input_latitud');
  const input_longitud = document.getElementById('id_input_longitud');
  if (input_latitud) input_latitud.value = lat;
  if (input_longitud) input_longitud.value = lon;

  // Manejar marcador
  if (marker) marker.setLatLng(e.latlng);
  else marker = L.marker(e.latlng).addTo(map);

  marker.bindPopup(`Lat: ${lat}<br>Lon: ${lon}`).openPopup();

  // Actualizar ambos paneles
  updateCurrentData(lat, lon);
  updatePrediction(lat, lon);
});