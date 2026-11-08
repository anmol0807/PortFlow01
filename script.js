// Load saved data
function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

let containers = loadData("portflow_containers");
let vessels = loadData("portflow_vessels");
let movements = loadData("portflow_movements");
let yardAllocations = loadData("portflow_yards");

// Save data in browser
function saveData() {
    localStorage.setItem("portflow_containers", JSON.stringify(containers));
    localStorage.setItem("portflow_vessels", JSON.stringify(vessels));
    localStorage.setItem("portflow_movements", JSON.stringify(movements));
    localStorage.setItem("portflow_yards", JSON.stringify(yardAllocations));
}

// Prevent HTML problems when displaying user input
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

// Show a message
function showMessage(message, type = "success") {
    document.querySelector(".toast-message")?.remove();

    let box = document.createElement("div");
    box.className = "toast-message";
    box.textContent = message;
    box.style.cssText = `
        position:fixed; top:22px; right:22px; z-index:9999;
        padding:13px 18px; color:white; border-radius:7px;
        background:${type === "success" ? "#16845d" : "#c43d3d"};
    `;

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
}

// Add activity to history
function addMovement(id, activity, location) {
    movements.unshift({
        id,
        activity,
        location,
        date: new Date().toLocaleString()
    });

    saveData();
    displayHistory();
}

// Container section
function displayContainers() {
    let table = document.getElementById("containerTable");
    if (!table) return;

    let query = document.getElementById("searchContainer")?.value.toLowerCase() || "";
    table.innerHTML = "";

    containers.forEach(container => {
        let details = [
            container.id,
            container.destination,
            container.type,
            container.status
        ].join(" ").toLowerCase();

        if (!details.includes(query)) return;

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(container.id)}</td>
            <td>${escapeHTML(container.type)}</td>
            <td>${escapeHTML(container.size)}</td>
            <td>${escapeHTML(container.destination)}</td>
            <td>
                <select class="status-select" data-status="${escapeHTML(container.id)}">
                    ${["Arrived", "In Yard", "Departed"].map(status =>
                        `<option ${container.status === status ? "selected" : ""}>${status}</option>`
                    ).join("")}
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

    // Change status
    table.querySelectorAll("[data-status]").forEach(select => {
        select.addEventListener("change", () => {
            let c = containers.find(item => item.id === select.dataset.status);
            if (!c) return;

            let oldStatus = c.status;
            c.status = select.value;

            addMovement(c.id, `Status changed: ${oldStatus} to ${c.status}`, c.destination);
            displayContainers();
            displayYards();
            updateDashboard();
            showMessage("Container status updated.");
        });
    });

    // Edit destination
    table.querySelectorAll("[data-edit]").forEach(button => {
        button.addEventListener("click", () => {
            let c = containers.find(item => item.id === button.dataset.edit);
            if (!c) return;

            let destination = prompt("Enter new destination:", c.destination);
            if (destination === null || !destination.trim()) return;

            c.destination = destination.trim();
            saveData();
            addMovement(c.id, "Destination updated", c.destination);
            displayContainers();
            updateDashboard();
            showMessage("Container updated.");
        });
    });

    // Assign vessel
    table.querySelectorAll("[data-vessel]").forEach(button => {
        button.addEventListener("click", () => {
            let c = containers.find(item => item.id === button.dataset.vessel);
            if (!c) return;

            if (!vessels.length) {
                showMessage("Add a vessel first.", "error");
                return;
            }

            let choices = vessels.map((v, i) =>
                `${i + 1}. ${v.name} (${v.id})`
            ).join("\n");

            let answer = prompt("Choose vessel number:\n" + choices);
            if (answer === null) return;

            let vessel = vessels[Number(answer) - 1];

            if (!vessel) {
                showMessage("Invalid vessel selection.", "error");
                return;
            }

            c.vessel = vessel.name;
            saveData();
            addMovement(c.id, "Vessel assigned", vessel.name);
            displayContainers();
            showMessage("Vessel assigned.");
        });
    });

    // Delete container
    table.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => {
            let id = button.dataset.delete;
            if (!confirm("Delete container " + id + "?")) return;

            containers = containers.filter(c => c.id !== id);
            yardAllocations = yardAllocations.filter(y => y.containerId !== id);

            saveData();
            addMovement(id, "Container deleted", "PortFlow");
            displayContainers();
            displayYards();
            updateDashboard();
            showMessage("Container deleted.");
        });
    });
}

// Add container
document.getElementById("containerForm")?.addEventListener("submit", event => {
    event.preventDefault();

    let id = document.getElementById("containerId").value.trim();

    if (containers.some(c => c.id.toLowerCase() === id.toLowerCase())) {
        showMessage("Container ID already exists.", "error");
        return;
    }

    let container = {
        id,
        type: document.getElementById("containerType").value,
        size: document.getElementById("containerSize").value,
        destination: document.getElementById("destination").value.trim(),
        status: "Arrived",
        vessel: "Not Assigned",
        yard: "Not Assigned",
        block: "—",
        slot: "—"
    };

    containers.push(container);
    saveData();
    addMovement(id, "Container added", container.destination);

    event.target.reset();
    displayContainers();
    displayYards();
    updateDashboard();
    showMessage("Container added successfully.");
});

// Search containers
document.getElementById("searchContainer")?.addEventListener("input", displayContainers);

// Vessel section
function displayVessels() {
    let table = document.getElementById("vesselTable");
    if (!table) return;

    table.innerHTML = "";

    vessels.forEach(vessel => {
        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(vessel.name)}</td>
            <td>${escapeHTML(vessel.id)}</td>
            <td>${escapeHTML(vessel.voyage)}</td>
            <td>
                <button class="action-btn danger" data-remove-vessel="${escapeHTML(vessel.id)}">Delete</button>
            </td>
        `;

        table.appendChild(row);
    });

    table.querySelectorAll("[data-remove-vessel]").forEach(button => {
        button.addEventListener("click", () => {
            let id = button.dataset.removeVessel;
            let vessel = vessels.find(v => v.id === id);
            if (!vessel) return;

            if (containers.some(c => c.vessel === vessel.name)) {
                showMessage("Reassign this vessel before deleting it.", "error");
                return;
            }

            if (!confirm("Delete vessel " + vessel.name + "?")) return;

            vessels = vessels.filter(v => v.id !== id);
            saveData();
            displayVessels();
            showMessage("Vessel deleted.");
        });
    });
}

// Add vessel
document.getElementById("vesselForm")?.addEventListener("submit", event => {
    event.preventDefault();

    let name = document.getElementById("vesselName").value.trim();
    let id = document.getElementById("vesselId").value.trim();
    let voyage = document.getElementById("voyageNumber").value.trim();

    if (vessels.some(v => v.id.toLowerCase() === id.toLowerCase())) {
        showMessage("Vessel ID already exists.", "error");
        return;
    }

    vessels.push({ name, id, voyage });
    saveData();
    displayVessels();
    event.target.reset();
    showMessage("Vessel added successfully.");
});

// Yard section
function displayYards() {
    let table = document.getElementById("yardTable");
    if (!table) return;

    table.innerHTML = "";

    yardAllocations.forEach(yard => {
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

// Assign yard location
document.getElementById("yardForm")?.addEventListener("submit", event => {
    event.preventDefault();

    let id = document.getElementById("yardContainerId").value.trim();
    let c = containers.find(item => item.id.toLowerCase() === id.toLowerCase());

    if (!c) {
        showMessage("Container not found.", "error");
        return;
    }

    if (c.status === "Departed") {
        showMessage("Departed containers cannot be assigned to a yard.", "error");
        return;
    }

    let yard = document.getElementById("yardName").value.trim();
    let block = document.getElementById("blockNumber").value.trim();
    let slot = document.getElementById("slotNumber").value.trim();

    c.yard = yard;
    c.block = block;
    c.slot = slot;
    c.status = "In Yard";

    yardAllocations = yardAllocations.filter(y =>
        y.containerId.toLowerCase() !== id.toLowerCase()
    );

    yardAllocations.push({ containerId: c.id, yard, block, slot });

    saveData();
    addMovement(c.id, "Yard location assigned", `${yard} / ${block} / ${slot}`);

    event.target.reset();
    displayContainers();
    displayYards();
    updateDashboard();
    showMessage("Yard location assigned.");
});

// Movement history
function displayHistory() {
    let table = document.getElementById("historyTable");
    if (!table) return;

    table.innerHTML = "";

    movements.forEach(m => {
        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(m.id)}</td>
            <td>${escapeHTML(m.activity)}</td>
            <td>${escapeHTML(m.location)}</td>
            <td>${escapeHTML(m.date)}</td>
        `;

        table.appendChild(row);
    });
}

// Dashboard numbers
function updateDashboard() {
    let total = document.getElementById("totalContainers");
    if (!total) return;

    total.textContent = containers.length;
    document.getElementById("arrivedContainers").textContent =
        containers.filter(c => c.status === "Arrived").length;
    document.getElementById("yardContainers").textContent =
        containers.filter(c => c.status === "In Yard").length;
    document.getElementById("departedContainers").textContent =
        containers.filter(c => c.status === "Departed").length;
}

// Track container
function trackContainer() {
    let id = document.getElementById("trackingId").value.trim().toLowerCase();
    let result = document.getElementById("trackingResult");

    let c = containers.find(item => item.id.toLowerCase() === id);

    if (!c) {
        result.textContent = "Container not found.";
        return;
    }

    result.innerHTML = `
        <h3>Container Details</h3>
        <p><b>Container ID:</b> ${escapeHTML(c.id)}</p>
        <p><b>Type:</b> ${escapeHTML(c.type)}</p>
        <p><b>Size:</b> ${escapeHTML(c.size)}</p>
        <p><b>Destination:</b> ${escapeHTML(c.destination)}</p>
        <p><b>Status:</b> ${escapeHTML(c.status)}</p>
        <p><b>Vessel:</b> ${escapeHTML(c.vessel || "Not assigned")}</p>
        <p><b>Yard:</b> ${escapeHTML(c.yard || "Not assigned")}</p>
        <p><b>Block:</b> ${escapeHTML(c.block || "—")}</p>
        <p><b>Slot:</b> ${escapeHTML(c.slot || "—")}</p>
    `;
}

window.trackContainer = trackContainer;

// Start dashboard
displayContainers();
displayVessels();
displayYards();
displayHistory();
updateDashboard();
