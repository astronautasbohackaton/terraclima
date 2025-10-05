// La fecha del JSON que recibimos
const TARGET_DATE = '20250925'; 

// SIMULACIÓN: Objeto JSON con los datos extraídos de la API de NASA POWER
const NASA_DATA = {
    "T2M": 15.55,       // Temperatura en Celsius
    "PS": 77.23,        // Presión en kPa
    "RH2M": 83.09,      // Humedad Relativa en %
    "WS10M": 1.14,      // Velocidad del Viento en m/s
    "PRECTOTCORR": 10.91 // Precipitación en mm/día
};

function actualizarWidget(data) {
    // === TARJETA 1: TEMPERATURA ===
    const tempValue = data.T2M.toFixed(1);
    document.querySelector('.temperature').textContent = `${tempValue}°C`;
    
    // === TARJETA 2: PRECIPITACIÓN Y HUMEDAD ===
    const precipValue = data.PRECTOTCORR.toFixed(2);
    document.querySelector('.precipitation').textContent = `${precipValue} mm`;

    const humidityValue = data.RH2M.toFixed(2);
    document.querySelector('.relative-humidity').textContent = `${humidityValue} %`;

    // === TARJETA 3: VIENTO Y PRESIÓN ===
    const windSpeedValue = data.WS10M.toFixed(2);
    document.querySelector('.wind-speed').textContent = `${windSpeedValue} m/s`;
    
    const pressureValue = data.PS.toFixed(2);
    document.querySelector('.surface-pressure').textContent = `${pressureValue} kPa`;
}

// Función que simularía la llamada a la API y el procesamiento
function cargarDatosClima() {
  
    const processedData = {};
    for (const key in NASA_DATA) {
        
        processedData[key] = NASA_DATA[key]; 
    }
    
    actualizarWidget(processedData);

}

document.addEventListener('DOMContentLoaded', cargarDatosClima);