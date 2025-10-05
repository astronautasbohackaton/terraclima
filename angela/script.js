// ========= PANEL HTML =========
const el = {
    date:  document.getElementById('p-date'),
    coord: document.getElementById('p-coord'),
    t2m:   document.getElementById('p-t2m'),
    status:document.getElementById('p-status')
};

const fmtYYYYMMDD = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
const isoFromYYYYMMDD = s => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
const safeNum = v => Number.isFinite(+v)? +v : null;

// ========= FUNCIÓN PARA PREDICCIÓN =========
function linearRegression(y){
    const n = y.length;
    const x = Array.from({length:n},(_,i)=>i+1);
    const sumX = x.reduce((a,b)=>a+b,0);
    const sumY = y.reduce((a,b)=>a+b,0);
    const sumXY = x.reduce((a,b,i)=>a+b*y[i],0);
    const sumX2 = x.reduce((a,b)=>a+b*b,0);
    const a = (n*sumXY - sumX*sumY)/(n*sumX2 - sumX*sumX);
    const b = (sumY - a*sumX)/n;
    return {a,b};
}

function predictTemperatures(baseTemps, daysAhead){
    let forecast = [];
    let data = [...baseTemps];
    const avgTemp = baseTemps.reduce((a,b)=>a+b,0)/baseTemps.length;
    const maxTemp = Math.max(...baseTemps);
    const minTemp = Math.min(...baseTemps);
    const tempRange = maxTemp - minTemp;

    for(let i=0;i<daysAhead;i++){
        const {a,b} = linearRegression(data);
        let next = a*(data.length+1)+b;
        // Curvas naturales con temperatura media
        next += Math.sin(i*1.1)*(tempRange*0.18);
        next += Math.cos(i*0.85)*(tempRange*0.14);
        next += Math.sin(i*0.75)*(tempRange*0.10);
        const deviation = next-avgTemp;
        if(Math.abs(deviation) > tempRange*0.9) next = avgTemp+(deviation>0? tempRange*0.9: -tempRange*0.9);
        forecast.push(next);
        data.push(next);
    }
    return forecast;
}

// ========= MAPA =========
const map = L.map('map').setView([0,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
let marker;
map.on('click', e=>{
    const lat = +e.latlng.lat.toFixed(6);
    const lon = +e.latlng.lng.toFixed(6);
    if(marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);
    marker.bindPopup(`Lat: ${lat}<br>Lon: ${lon}`).openPopup();
    updatePredictor(lat, lon);
});

// ========= FUNCIONES PANEL + PREDICCIÓN =========
function setStatus(msg){ el.status.textContent = msg; }
function clearVals(){ el.t2m.textContent='—'; el.date.textContent='—'; }

function lastNDaysRange(){
    const today=new Date();
    const end = fmtYYYYMMDD(today); // Fecha actual
    const start = new Date(today); start.setDate(start.getDate()-7); // últimos 7 días
    return {start: fmtYYYYMMDD(start), end};
}

let chartInstance=null;

async function updatePredictor(lat, lon){
    el.coord.textContent=`Ubicación: ${lat}, ${lon}`;
    setStatus('Consultando NASA POWER…'); clearVals();

    const {start,end} = lastNDaysRange();
    const params = ['T2M'].join(',');
    const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
    url.search = new URLSearchParams({parameters: params, community:'AG', longitude:lon, latitude:lat, start, end, format:'JSON'});

    try{
        const r = await fetch(url,{mode:'cors'});
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const param = data?.properties?.parameter || {};

        const dates = Object.keys(param.T2M || {});
        const validDates = dates.filter(d => safeNum(param.T2M[d])!==null && param.T2M[d]>-900).sort();
        if(!validDates.length) throw new Error('Sin datos recientes.');

        // Temperaturas de los últimos 7 días
        const historicalTemps = validDates.map(d => safeNum(param.T2M[d]));

        // Predicción para hoy + 5 días
        const predicted = predictTemperatures(historicalTemps,6);
        const forecastDates = [];
        const today = new Date();
        for(let i=0;i<6;i++){
            const next = new Date(today.getTime()+i*86400000);
            forecastDates.push(isoFromYYYYMMDD(fmtYYYYMMDD(next)));
        }

        // Actualizar panel con temperatura de hoy
        el.date.textContent = forecastDates[0];
        el.t2m.textContent = predicted[0].toFixed(1)+' °C';
        setStatus(`Datos de ${forecastDates[0]}`);

        // Graficar Chart.js
        const ctx = document.getElementById('tempChart').getContext('2d');
        if(chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx,{
            type:'line',
            data:{
                labels: forecastDates,
                datasets:[{
                    label:'Temperatura Media (°C)',
                    data:predicted,
                    borderColor:'rgb(34,123,255)',
                    backgroundColor:'rgba(34,123,255,0.2)',
                    fill:true,
                    tension:0.4
                }]
            },
            options:{
                responsive:true,
                plugins:{legend:{display:true}},
                scales:{y:{beginAtZero:false}}
            }
        });

    }catch(err){
        console.error(err);
        setStatus('Error obteniendo datos.');
    }
}






