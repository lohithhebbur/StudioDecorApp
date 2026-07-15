// ========================================
// Decor My Nest Studio App
// CRM Module v1.0
// ========================================

const STORAGE_KEY = "sdcp_customers";

let customers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let editingIndex = -1;

// ---------- Elements ----------

const table = document.getElementById("customerTable");
const modal = document.getElementById("customerModal");

const btnAdd = document.getElementById("btnAddCustomer");
const btnSave = document.getElementById("saveCustomer");
const btnClose = document.getElementById("closeModal");

const txtSearch = document.getElementById("searchCustomer");

const txtName = document.getElementById("customerName");
const txtMobile = document.getElementById("customerMobile");
const txtEmail = document.getElementById("customerEmail");

const ddlType = document.getElementById("projectType");
const ddlStatus = document.getElementById("projectStatus");

const txtBudget = document.getElementById("projectBudget");

// ---------- Startup ----------

renderCustomers();

// ---------- Events ----------

btnAdd.onclick = openNewCustomer;

btnClose.onclick = closeModal;

btnSave.onclick = saveCustomer;

txtSearch.addEventListener("input", filterCustomers);

// ---------- Functions ----------

function openNewCustomer() {

    editingIndex = -1;

    clearForm();

    modal.classList.remove("hidden");

}

function closeModal() {

    modal.classList.add("hidden");

}

function clearForm() {

    txtName.value = "";
    txtMobile.value = "";
    txtEmail.value = "";
    txtBudget.value = "";

    ddlType.selectedIndex = 0;
    ddlStatus.selectedIndex = 0;

}

function generateCustomerId() {

    const next = customers.length + 1;

    return "CUS" + String(next).padStart(6, "0");

}

function saveCustomer() {

    if (txtName.value.trim() === "") {

        alert("Customer Name is required.");

        txtName.focus();

        return;

    }

    if (txtMobile.value.trim() === "") {

        alert("Mobile Number is required.");

        txtMobile.focus();

        return;

    }

    const duplicate = customers.find((c, i) =>
        c.mobile === txtMobile.value.trim() &&
        i !== editingIndex
    );

    if (duplicate) {

        alert("Customer already exists with this mobile number.");

        return;

    }

    const customer = {

        id: editingIndex === -1
            ? generateCustomerId()
            : customers[editingIndex].id,

        name: txtName.value.trim(),

        mobile: txtMobile.value.trim(),

        email: txtEmail.value.trim(),

        projectType: ddlType.value,

        status: ddlStatus.value,

        budget: Number(txtBudget.value) || 0,

        createdOn: new Date().toLocaleDateString()

    };

    if (editingIndex === -1) {

        customers.push(customer);

    } else {

        customers[editingIndex] = customer;

    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));

    closeModal();

    renderCustomers();

}

function renderCustomers(list = customers) {

    table.innerHTML = "";

    if (list.length === 0) {

        table.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;padding:30px;">
                No customers found.
            </td>
        </tr>
        `;

        return;

    }

    list.forEach((customer, index) => {

        table.innerHTML += `

        <tr>

            <td>${customer.id}</td>

            <td>${customer.name}</td>

            <td>${customer.mobile}</td>

            <td>${customer.projectType}</td>

            <td>${statusBadge(customer.status)}</td>

            <td>₹ ${customer.budget.toLocaleString()}</td>

            <td>

                <button class="action-btn" onclick="editCustomer(${index})">
                    ✏️
                </button>

                <button class="action-btn" onclick="deleteCustomer(${index})">
                    🗑️
                </button>

            </td>

        </tr>

        `;

    });

}

function editCustomer(index) {

    editingIndex = index;

    const c = customers[index];

    txtName.value = c.name;
    txtMobile.value = c.mobile;
    txtEmail.value = c.email;
    ddlType.value = c.projectType;
    ddlStatus.value = c.status;
    txtBudget.value = c.budget;

    modal.classList.remove("hidden");

}

function deleteCustomer(index) {

    if (!confirm("Delete this customer?")) return;

    customers.splice(index, 1);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));

    renderCustomers();

}

function filterCustomers() {

    const search = txtSearch.value.toLowerCase();

    const filtered = customers.filter(customer =>

        customer.name.toLowerCase().includes(search) ||

        customer.mobile.includes(search) ||

        customer.projectType.toLowerCase().includes(search)

    );

    renderCustomers(filtered);

}

function statusBadge(status) {

    switch(status){

        case "Lead":
            return `<span class="status-badge status-lead">${status}</span>`;

        case "Work in Progress":
            return `<span class="status-badge status-progress">${status}</span>`;

        case "Completed":
            return `<span class="status-badge status-completed">${status}</span>`;

        default:
            return status;
    }

}