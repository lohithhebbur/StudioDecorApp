// Decor My Nest Studio App
// Dashboard v3.0

document.addEventListener("DOMContentLoaded", () => {

    // Welcome message
    const hour = new Date().getHours();

    let greeting = "Welcome";

    if (hour < 12) greeting = "Good Morning";
    else if (hour < 17) greeting = "Good Afternoon";
    else greeting = "Good Evening";

    const user = document.querySelector(".user");

    user.innerHTML = `${greeting}, Lohith 👋`;

    // Animate Cards
    const cards = document.querySelectorAll(".card");

    cards.forEach((card, index) => {

        card.style.opacity = 0;
        card.style.transform = "translateY(25px)";

        setTimeout(() => {

            card.style.transition = "0.45s ease";
            card.style.opacity = 1;
            card.style.transform = "translateY(0)";

        }, index * 120);

    });

    // Sidebar Active Menu
    const menuItems = document.querySelectorAll(".sidebar nav a");

    menuItems.forEach(item => {

        item.addEventListener("click", () => {

            menuItems.forEach(i => i.classList.remove("active"));

            item.classList.add("active");

        });

    });

});