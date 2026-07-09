/* =========================================
   Decor My Nest – Studio Contractor App
   app.js
========================================= */

// ---------------- Sidebar ----------------

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("show");
    });
}

// ---------------- Dark Mode ----------------

let dark = false;

const themeBtn = document.querySelector(".top-icons");

themeBtn.addEventListener("dblclick", () => {

    dark = !dark;

    if (dark) {

        document.documentElement.style.setProperty("--bg","#0f172a");
        document.documentElement.style.setProperty("--card","#1e293b");
        document.documentElement.style.setProperty("--text","#ffffff");
        document.documentElement.style.setProperty("--muted","#cbd5e1");
        document.documentElement.style.setProperty("--border","#334155");

    } else {

        document.documentElement.style.setProperty("--bg","#f5f7fb");
        document.documentElement.style.setProperty("--card","#ffffff");
        document.documentElement.style.setProperty("--text","#1f2937");
        document.documentElement.style.setProperty("--muted","#6b7280");
        document.documentElement.style.setProperty("--border","#e5e7eb");

    }

});

// ---------------- Dashboard Cards ----------------

const dashboard = {

    revenue:0,
    pending:0,
    projects:0,
    visits:0

};

localStorage.setItem(
    "dashboard",
    JSON.stringify(dashboard)
);

// ---------------- Charts ----------------

const revenueChart = document.getElementById("revenueChart");

if(revenueChart){

new Chart(revenueChart,{

type:"bar",

data:{

labels:["Jan","Feb","Mar","Apr","May","Jun"],

datasets:[{

label:"Revenue",

data:[0,0,0,0,0,0],

borderWidth:1

}]

},

options:{

responsive:true,

maintainAspectRatio:false

}

});

}

const projectChart=document.getElementById("projectChart");

if(projectChart){

new Chart(projectChart,{

type:"doughnut",

data:{

labels:["Running","Completed","Pending"],

datasets:[{

data:[0,0,0]

}]

},

options:{

responsive:true,

maintainAspectRatio:false

}

});

}

// ---------------- Greeting ----------------

const hour=new Date().getHours();

let greet="Welcome";

if(hour<12){

greet="Good Morning ☀️";

}else if(hour<17){

greet="Good Afternoon 🌤";

}else{

greet="Good Evening 🌙";

}

const title=document.querySelector(".welcome h1");

if(title){

title.innerHTML=greet+", Lohith 👋";

}

// ---------------- Quick Buttons ----------------

document.querySelectorAll(".quick button").forEach(btn=>{

btn.addEventListener("click",()=>{

alert(btn.innerText+" module will be available in the next update.");

});

});

// ---------------- Notifications ----------------

console.log("Decor My Nest Contractor App Loaded");

// ---------------- Service Worker ----------------

if("serviceWorker" in navigator){

window.addEventListener("load",()=>{

navigator.serviceWorker.register("service-worker.js")

.then(()=>{

console.log("Service Worker Registered");

})

.catch(()=>{

console.log("Service Worker Failed");

});

});

}