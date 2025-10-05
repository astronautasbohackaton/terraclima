let date = new Date();
let year = date.getFullYear();
let month = date.getMonth();

const day = document.querySelector(".calendar-dates");
const currdate = document.querySelector(".calendar-current-date");
const prenexIcons = document.querySelectorAll(".calendar-navigation span");

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let clickedDay = null;
let selectedDayElement = null;

const manipulate = () => {
  let dayone = new Date(year, month, 1).getDay();
  let lastdate = new Date(year, month + 1, 0).getDate();
  let dayend = new Date(year, month, lastdate).getDay();
  let monthlastdate = new Date(year, month, 0).getDate();

  let lit = "";

  for (let i = dayone; i > 0; i--) {
    lit += `<li class="inactive">${monthlastdate - i + 1}</li>`;
  }

  
  for (let i = 1; i <= lastdate; i++) {
    let isToday = (i === date.getDate()
      && month === new Date().getMonth()
      && year === new Date().getFullYear()) ? "active" : "";

    let highlightClass = (clickedDay === i) ? "highlight" : "";

    lit += `<li class="${isToday} ${highlightClass}" data-day="${i}">${i}</li>`;
  }


  for (let i = dayend; i < 6; i++) {
    lit += `<li class="inactive">${i - dayend + 1}</li>`;
  }

  currdate.innerText = `${months[month]} ${year}`;
  day.innerHTML = lit;

  addClickListenersToDays(currdate.innerText, year);
};

function formatearFecha(fecha) {
    const year = fecha.getFullYear(); // Año
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0'); // Mes (sumamos 1 porque los meses empiezan desde 0)
    const day = fecha.getDate().toString().padStart(2, '0'); // Día
    
    return `${year}${month}${day}`; // Devuelve la fecha en formato "yyyymmdd"
}

function addClickListenersToDays( month, year) {
  const allDays = day.querySelectorAll('li:not(.inactive)');
  allDays.forEach(li => {
    li.addEventListener('click', () => {
      if (selectedDayElement) {
        selectedDayElement.classList.remove('highlight');
      }

      li.classList.add('highlight');
      selectedDayElement = li;

      clickedDay = parseInt(li.getAttribute('data-day'));
	  
	  //alert ("CLICKED DAY: "+ clickedDay );
	  //alert ("CLICKED MONTH: "+ month );
	  // alert ("CLICKED YEAR: "+ year );

const input_fecha_inicio= document.getElementById('id_input_fecha_inicio');
input_fecha_inicio.value=clickedDay;
const input_fecha_fin= document.getElementById('id_input_fecha_fin');
input_fecha_fin.value=month;


      console.log('Clicked day:', clickedDay);
      console.log('Clicked day:', month);
      console.log('Clicked day:', clickedDay+" "+month);
      const fechaStr = clickedDay+" "+month;
// Crear un objeto Date a partir de la cadena de texto
const fecha = new Date(fechaStr);
      console.log(fecha);


      const fechaFormateada = formatearFecha(fecha);
console.log(fechaFormateada); // 
const input_fecha_format= document.getElementById('id_input_fecha_format');
input_fecha_format.value=fechaFormateada;


    });
  });
}

manipulate();

prenexIcons.forEach(icon => {
  icon.addEventListener("click", () => {
    month = icon.id === "calendar-prev" ? month - 1 : month + 1;

    if (month < 0 || month > 11) {
      date = new Date(year, month, new Date().getDate());
      year = date.getFullYear();
      month = date.getMonth();
	  

    } else {
      date = new Date();
    }
	


    clickedDay = null;
    selectedDayElement = null;

    manipulate();
  });
});