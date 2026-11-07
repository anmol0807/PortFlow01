// ==========================================
// PORTFLOW - SIMPLE JAVASCRIPT
// No Firebase, No Login, No Backend
// Data is saved in browser localStorage
// ==========================================


// 1. LOAD DATA FROM BROWSER

function loadData(key) {
    try {
        let data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

let containers = loadData("portflow_containers");
let vessels = loadData("portflow_vessels");
let movements = loadData("portflow_movements");
let yardAllocations = loadData("portflow_yards");


// 2. SAVE DATA IN BROWSER

function saveData() {
    localStorage.setItem("portflow_containers", JSON.stringify(containers));
    localStorage.setItem("portflow_vessels", JSON.stringify(vessels));
    localStorage.setItem("portflow_movements", JSON.stringify(movements));
    localStorage.setItem("portflow_yards", JSON.stringify(yardAllocations));
}


// 3. SHOW SUCCESS OR ERROR MESSAGE

function showMessage(message, type = "success") {
    let oldMessage = document.querySelector(".toast-message");

    if (oldMessage) {
        oldMessage.remove();
    }

    let box = document.createElement("div");
    box.className = "toast-message";
    box.textContent = message;

    box.style.cssText = `
        position: fixed;
        right: 22px;
        top: 22px;
        z-index: 9999;
        color: white;
        padding: 13px 18px;
        border-radius: 7px;
        background: ${type === "success" ? "#16845d" : "#c43d3d"};
    `;

    document.body.appendChild(box);

    setTimeout(function () {
        box.remove();
    }, 3000);
}


// 4. PROTECT TEXT BEFORE DISPLAYING IT IN HTML

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const symbols = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return symbols[char];
    });
}


// 5. ADD ACTIVITY TO MOVEMENT HISTORY

function addMovement(id, activity, location) {
    movements.unshift({
        id: id,
        activity: activity,
        location: location,
        date: new Date().toLocaleString()
    });

    saveData();
    displayHistory();
}


// ==========================================
// 6. CONTAINER MANAGEMENT
// ==========================================


// DISPLAY ALL CONTAINERS

function displayContainers() {
    let table = document.getElementById("containerTable");

    if (!table) return;

    let search = document.getElementById("searchContainer");
    let query = search ? search.value.toLowerCase() : "";

    table.innerHTML = "";

    containers.forEach(function (container) {

        let details = (
            container.id + " " +
            container.destination + " " +
            container.type + " " +
            container.status
        ).toLowerCase();

        if (!details.includes(query)) return;

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(container.id)}</td>
            <td>${escapeHTML(container.type)}</td>
            <td>${escapeHTML(container.size)}</td>
            <td>${escapeHTML(container.destination)}</td>

            <td>
                <select class="status-select" data-status="${escapeHTML(container.id)}">
                    <option ${container.status === "Arrived" ? "selected" : ""}>Arrived</option>
                    <option ${container.status === "In Yard" ? "selected" : ""}>In Yard</option>
                    <option ${container.status === "Departed" ? "selected" : ""}>Departed</option>
                </select>
            </td>

            <td>
                <button class="action-btn" data-edit="${escapeHTML(container.id)}">Edit</button>
                <button class="action-btn" data-vessel="${escapeHTML(container.id)}">Vessel</button>
                <button class="action-btn danger" data-delete="${escapeHTML(container.id)}">Delete</button>
            </td>
        `;

        table.appendChild(row);
    });


    // CHANGE CONTAINER STATUS

    table.querySelectorAll("[data-status]").forEach(function (select) {

        select.addEventListener("change", function () {

            let container = containers.find(function (item) {
                return item.id === select.dataset.status;
            });

            if (!container) return;

            let oldStatus = container.status;
            container.status = select.value;

            addMovement(
                container.id,
                "Status changed: " + oldStatus + " to " + container.status,
                container.destination
            );

            displayContainers();
            displayYards();
            updateDashboard();

            showMessage("Container status updated.");
        });
    });


    // EDIT CONTAINER DESTINATION

    table.querySelectorAll("[data-edit]").forEach(function (button) {

        button.addEventListener("click", function () {

            let container = containers.find(function (item) {
                return item.id === button.dataset.edit;
            });

            if (!container) return;

            let newDestination = prompt(
                "Enter new destination:",
                container.destination
            );

            if (newDestination === null || newDestination.trim() === "") {
                return;
            }

            container.destination = newDestination.trim();

            saveData();

            addMovement(
                container.id,
                "Destination updated",
                container.destination
            );

            displayContainers();
            updateDashboard();

            showMessage("Container updated.");
        });
    });


    // ASSIGN VESSEL TO CONTAINER

    table.querySelectorAll("[data-vessel]").forEach(function (button) {

        button.addEventListener("click", function () {

            let container = containers.find(function (item) {
                return item.id === button.dataset.vessel;
            });

            if (!container) return;

            if (vessels.length === 0) {
                showMessage("Add a vessel first.", "error");
                return;
            }

            let choices = vessels.map(function (vessel, index) {
                return (index + 1) + ". " + vessel.name + " (" + vessel.id + ")";
            }).join("\n");

            let answer = prompt("Choose vessel number:\n" + choices);

            if (answer === null) return;

            let selectedVessel = vessels[Number(answer) - 1];

            if (!selectedVessel) {
                showMessage("Invalid vessel selection.", "error");
                return;
            }

            container.vessel = selectedVessel.name;

            saveData();

            addMovement(
                container.id,
                "Vessel assigned",
                selectedVessel.name
            );

            displayContainers();

            showMessage("Vessel assigned successfully.");
        });
    });


    // DELETE CONTAINER

    table.querySelectorAll("[data-delete]").forEach(function (button) {

        button.addEventListener("click", function () {

            let id = button.dataset.delete;

            if (!confirm("Delete container " + id + "?")) return;

            containers = containers.filter(function (item) {
                return item.id !== id;
            });

            yardAllocations = yardAllocations.filter(function (item) {
                return item.containerId !== id;
            });

            saveData();

            addMovement(id, "Container deleted", "PortFlow");

            displayContainers();
            displayYards();
            updateDashboard();

            showMessage("Container deleted.");
        });
    });
}


// ADD NEW CONTAINER

let containerForm = document.getElementById("containerForm");

if (containerForm) {

    containerForm.addEventListener("submit", function (event) {

        event.preventDefault();

        let id = document.getElementById("containerId").value.trim();

        let exists = containers.some(function (item) {
            return item.id.toLowerCase() === id.toLowerCase();
        });

        if (exists) {
            showMessage("Container ID already exists.", "error");
            return;
        }

        let newContainer = {
            id: id,
            type: document.getElementById("containerType").value,
            size: document.getElementById("containerSize").value,
            destination: document.getElementById("destination").value.trim(),
            status: "Arrived",
            vessel: "Not Assigned",
            yard: "Not Assigned",
            block: "—",
            slot: "—"
        };

        containers.push(newContainer);

        saveData();

        addMovement(id, "Container added", newContainer.destination);

        containerForm.reset();

        displayContainers();
        displayYards();
        updateDashboard();

        showMessage("Container added successfully.");
    });
}


// SEARCH CONTAINERS

document.getElementById("searchContainer")?.addEventListener(
    "input",
    displayContainers
);


// ==========================================
// 7. VESSEL MANAGEMENT
// ==========================================


// DISPLAY VESSELS

function displayVessels() {

    let table = document.getElementById("vesselTable");

    if (!table) return;

    table.innerHTML = "";

    vessels.forEach(function (vessel) {

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(vessel.name)}</td>
            <td>${escapeHTML(vessel.id)}</td>
            <td>${escapeHTML(vessel.voyage)}</td>
            <td>
                <button class="action-btn danger" data-remove-vessel="${escapeHTML(vessel.id)}">
                    Delete
                </button>
            </td>
        `;

        table.appendChild(row);
    });


    // DELETE VESSEL

    table.querySelectorAll("[data-remove-vessel]").forEach(function (button) {

        button.addEventListener("click", function () {

            let id = button.dataset.removeVessel;

            let vessel = vessels.find(function (item) {
                return item.id === id;
            });

            if (!vessel) return;

            let assigned = containers.some(function (container) {
                return container.vessel === vessel.name;
            });

            if (assigned) {
                showMessage("Reassign the vessel before deleting it.", "error");
                return;
            }

            if (!confirm("Delete vessel " + vessel.name + "?")) return;

            vessels = vessels.filter(function (item) {
                return item.id !== id;
            });

            saveData();
            displayVessels();

            showMessage("Vessel deleted.");
        });
    });
}


// ADD NEW VESSEL

document.getElementById("vesselForm")?.addEventListener("submit", function (event) {

    event.preventDefault();

    let name = document.getElementById("vesselName").value.trim();
    let id = document.getElementById("vesselId").value.trim();
    let voyage = document.getElementById("voyageNumber").value.trim();

    let exists = vessels.some(function (item) {
        return item.id.toLowerCase() === id.toLowerCase();
    });

    if (exists) {
        showMessage("Vessel ID already exists.", "error");
        return;
    }

    vessels.push({
        name: name,
        id: id,
        voyage: voyage
    });

    saveData();
    displayVessels();

    event.target.reset();

    showMessage("Vessel added successfully.");
});


// ==========================================
// 8. YARD ALLOCATION
// ==========================================


// DISPLAY YARD ALLOCATIONS

function displayYards() {

    let table = document.getElementById("yardTable");

    if (!table) return;

    table.innerHTML = "";

    yardAllocations.forEach(function (yard) {

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(yard.containerId)}</td>
            <td>${escapeHTML(yard.yard)}</td>
            <td>${escapeHTML(yard.block)}</td>
            <td>${escapeHTML(yard.slot)}</td>
        `;

        table.appendChild(row);
    });
}


// ADD OR UPDATE YARD LOCATION

document.getElementById("yardForm")?.addEventListener("submit", function (event) {

    event.preventDefault();

    let id = document.getElementById("yardContainerId").value.trim();

    let container = containers.find(function (item) {
        return item.id.toLowerCase() === id.toLowerCase();
    });

    if (!container) {
        showMessage("Container not found.", "error");
        return;
    }

    if (container.status === "Departed") {
        showMessage("Departed containers cannot be assigned to a yard.", "error");
        return;
    }

    let yard = document.getElementById("yardName").value.trim();
    let block = document.getElementById("blockNumber").value.trim();
    let slot = document.getElementById("slotNumber").value.trim();

    container.yard = yard;
    container.block = block;
    container.slot = slot;
    container.status = "In Yard";

    // Remove old allocation before adding the new one.

    yardAllocations = yardAllocations.filter(function (item) {
        return item.containerId.toLowerCase() !== id.toLowerCase();
    });

    yardAllocations.push({
        containerId: container.id,
        yard: yard,
        block: block,
        slot: slot
    });

    saveData();

    addMovement(
        container.id,
        "Yard Location Assigned",
        yard + " / " + block + " / " + slot
    );

    event.target.reset();

    displayContainers();
    displayYards();
    updateDashboard();

    showMessage("Yard location assigned.");
});


// ==========================================
// 9. MOVEMENT HISTORY
// ==========================================


// DISPLAY MOVEMENT HISTORY

function displayHistory() {

    let table = document.getElementById("historyTable");

    if (!table) return;

    table.innerHTML = "";

    movements.forEach(function (movement) {

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(movement.id)}</td>
            <td>${escapeHTML(movement.activity)}</td>
            <td>${escapeHTML(movement.location)}</td>
            <td>${escapeHTML(movement.date)}</td>
        `;

        table.appendChild(row);
    });
}


// ==========================================
// 10. DASHBOARD SUMMARY
// ==========================================


// UPDATE DASHBOARD NUMBERS

function updateDashboard() {

    let total = document.getElementById("totalContainers");

    if (!total) return;

    let arrived = containers.filter(function (item) {
        return item.status === "Arrived";
    }).length;

    let inYard = containers.filter(function (item) {
        return item.status === "In Yard";
    }).length;

    let departed = containers.filter(function (item) {
        return item.status === "Departed";
    }).length;

    total.textContent = containers.length;

    document.getElementById("arrivedContainers").textContent = arrived;
    document.getElementById("yardContainers").textContent = inYard;
    document.getElementById("departedContainers").textContent = departed;
}


// ==========================================
// 11. CONTAINER TRACKING
// ==========================================


// SEARCH CONTAINER USING ITS ID

function trackContainer() {

    let id = document.getElementById("trackingId").value.trim();

    let result = document.getElementById("trackingResult");

    let container = containers.find(function (item) {
        return item.id.toLowerCase() === id.toLowerCase();
    });

    if (!container) {
        result.textContent = "Container not found.";
        return;
    }

    result.innerHTML = `
        <h3>Container Details</h3>

        <p><b>Container ID:</b> ${escapeHTML(container.id)}</p>
        <p><b>Type:</b> ${escapeHTML(container.type)}</p>
        <p><b>Size:</b> ${escapeHTML(container.size)}</p>
        <p><b>Destination:</b> ${escapeHTML(container.destination)}</p>
        <p><b>Status:</b> ${escapeHTML(container.status)}</p>
        <p><b>Vessel:</b> ${escapeHTML(container.vessel || "Not assigned")}</p>
        <p><b>Yard:</b> ${escapeHTML(container.yard || "Not assigned")}</p>
        <p><b>Block:</b> ${escapeHTML(container.block || "—")}</p>
        <p><b>Slot:</b> ${escapeHTML(container.slot || "—")}</p>
    `;
}


// Allow HTML button to call this function.

window.trackContainer = trackContainer;


// ==========================================
// 12. START PORTFLOW DASHBOARD
// ==========================================

// Display saved data when the website opens.

displayContainers();
displayVessels();
displayYards();
displayHistory();
updateDashboard();