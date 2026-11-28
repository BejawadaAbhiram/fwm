const STORAGE_KEYS = {
    users: "foodWaste_users",
    donations: "foodWaste_donations",
    currentUser: "foodWaste_currentUser"
};

const STATUSES = ["Pending", "Accepted", "Picked Up", "Completed", "Rejected"];

function readStorage(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
        return fallback;
    }
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
    return readStorage(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
    writeStorage(STORAGE_KEYS.users, users);
}

function getDonations() {
    return readStorage(STORAGE_KEYS.donations, []);
}

function saveDonations(donations) {
    writeStorage(STORAGE_KEYS.donations, donations);
}

function getCurrentUser() {
    return readStorage(STORAGE_KEYS.currentUser, null);
}

function setCurrentUser(user) {
    writeStorage(STORAGE_KEYS.currentUser, user);
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    window.location.href = "index.html";
}

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function seedData() {
    const users = getUsers();
    if (!users.some((user) => user.email === "admin@foodrescue.local")) {
        users.push({
            id: "admin-demo",
            name: "Administrator",
            email: "admin@foodrescue.local",
            phone: "0000000000",
            password: "admin123",
            role: "admin"
        });
        saveUsers(users);
    }
}

function requireLogin() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
        return null;
    }
    return user;
}

function requireAdmin() {
    const user = requireLogin();
    if (user && user.role !== "admin") {
        window.location.href = "userDashboard.html";
        return null;
    }
    return user;
}

function requireUser() {
    const user = requireLogin();
    if (user && user.role !== "user") {
        window.location.href = "admin.html";
        return null;
    }
    return user;
}

function formatDate(date) {
    if (!date) {
        return "-";
    }
    return new Date(`${date}T00:00:00`).toLocaleDateString();
}

function showMessage(element, message, type) {
    if (!element) {
        return;
    }
    element.textContent = message;
    element.className = `message ${type}`;
}

function updateNavigation() {
    const user = getCurrentUser();
    document.querySelectorAll("[data-auth-link]").forEach((link) => {
        if (!user) {
            link.textContent = "Login";
            link.href = "login.html";
        } else {
            link.textContent = user.role === "admin" ? "Admin Dashboard" : "Dashboard";
            link.href = user.role === "admin" ? "admin.html" : "userDashboard.html";
        }
    });
    document.querySelectorAll("[data-logout]").forEach((button) => {
        button.hidden = !user;
        button.addEventListener("click", logout);
    });
}

function setupCommonPage() {
    seedData();
    updateNavigation();
    document.querySelectorAll("[data-year]").forEach((element) => {
        element.textContent = new Date().getFullYear();
    });
}

function setupSignup() {
    const form = document.querySelector("#signup-form");
    if (!form) {
        return;
    }
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = document.querySelector("#signup-message");
        const data = new FormData(form);
        const name = data.get("name").trim();
        const email = data.get("email").trim().toLowerCase();
        const phone = data.get("phone").trim();
        const password = data.get("password");
        const users = getUsers();

        if (password.length < 6) {
            showMessage(message, "Password must contain at least 6 characters.", "error");
            return;
        }
        if (!/^\+?[0-9\s-]{10,15}$/.test(phone)) {
            showMessage(message, "Enter a valid phone number.", "error");
            return;
        }
        if (users.some((user) => user.email === email)) {
            showMessage(message, "An account with this email already exists.", "error");
            return;
        }

        users.push({ id: createId("user"), name, email, phone, password, role: "user" });
        saveUsers(users);
        showMessage(message, "Account created. Redirecting to login...", "success");
        window.setTimeout(() => { window.location.href = "login.html"; }, 700);
    });
}

function setupLogin() {
    const form = document.querySelector("#login-form");
    if (!form) {
        return;
    }
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = document.querySelector("#login-message");
        const data = new FormData(form);
        const email = data.get("email").trim().toLowerCase();
        const password = data.get("password");
        const user = getUsers().find((item) => item.email === email && item.password === password);
        if (!user) {
            showMessage(message, "Invalid email or password.", "error");
            return;
        }
        setCurrentUser(user);
        window.location.href = user.role === "admin" ? "admin.html" : "userDashboard.html";
    });
}

function setupPickupMap() {
    const mapElement = document.querySelector("#pickup-map");
    const addressInput = document.querySelector("#address");
    const latitudeInput = document.querySelector("#pickup-latitude");
    const longitudeInput = document.querySelector("#pickup-longitude");
    const status = document.querySelector("#map-status");
    const locateButton = document.querySelector("#locate-me");
    if (!mapElement || !addressInput || !latitudeInput || !longitudeInput || !status || !locateButton) return;
    if (typeof L === "undefined") {
        status.textContent = "The map could not be loaded. Enter the pickup address manually.";
        return;
    }
    const map = L.map(mapElement).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    let marker = null;
    let lookupTimer = null;
    let lastLookupStarted = 0;
    let selectionId = 0;
    let manualEditId = 0;
    addressInput.addEventListener("input", () => { manualEditId += 1; });
    const lookupAddress = async (latitude, longitude, selectedId, editId) => {
        lastLookupStarted = Date.now();
        status.textContent = "Looking up the address for this pin...";
        try {
            const query = new URLSearchParams({ format: "jsonv2", lat: latitude, lon: longitude });
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
            if (!response.ok) throw new Error(`Address lookup failed with status ${response.status}.`);
            const result = await response.json();
            if (selectedId !== selectionId) return;
            if (!result.display_name) throw new Error("No address was returned for this point.");
            if (editId !== manualEditId) {
                status.textContent = "Pin selected. Your manually edited address was kept.";
                return;
            }
            addressInput.value = result.display_name;
            status.textContent = "Pickup address updated from the map pin.";
        } catch (error) {
            console.error("Could not look up the pickup address.", error);
            if (selectedId === selectionId) status.textContent = "Could not look up this address. Enter or correct it manually.";
        }
    };
    const selectLocation = (location) => {
        selectionId += 1;
        const selectedId = selectionId;
        const editId = manualEditId;
        const latitude = location.lat;
        const longitude = location.lng;
        latitudeInput.value = latitude.toFixed(6);
        longitudeInput.value = longitude.toFixed(6);
        if (marker) marker.setLatLng(location);
        else marker = L.marker(location).addTo(map);
        status.textContent = "Pin selected. Looking up the address...";
        window.clearTimeout(lookupTimer);
        const wait = Math.max(1100 - (Date.now() - lastLookupStarted), 0);
        lookupTimer = window.setTimeout(() => lookupAddress(latitude, longitude, selectedId, editId), wait);
    };
    map.on("click", (event) => selectLocation(event.latlng));
    locateButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            status.textContent = "Location access is not available in this browser. You can still click the map.";
            return;
        }
        status.textContent = "Finding your current location...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = L.latLng(position.coords.latitude, position.coords.longitude);
                map.setView(location, 16);
                selectLocation(location);
            },
            () => { status.textContent = "Could not access your location. Check browser permission or click the map."; }
        );
    });
    mapElement.closest("form").addEventListener("reset", () => {
        selectionId += 1;
        window.clearTimeout(lookupTimer);
        if (marker) { marker.remove(); marker = null; }
        latitudeInput.value = "";
        longitudeInput.value = "";
        status.textContent = "Choose a point on the map or enter the pickup address below.";
    });
}

function setupDonationForm() {
    const form = document.querySelector("#donation-form");
    if (!form) {
        return;
    }
    const user = requireLogin();
    if (!user) {
        return;
    }
    const currentUserFields = { name: "#name", phone: "#phone", email: "#email" };
    Object.entries(currentUserFields).forEach(([field, selector]) => {
        const input = document.querySelector(selector);
        if (input) {
            input.value = user[field] || "";
        }
    });
    const pickupDate = document.querySelector("#pickup_date");
    if (pickupDate) {
        pickupDate.min = new Date().toISOString().split("T")[0];
    }
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = document.querySelector("#donation-message");
        const data = new FormData(form);
        const donation = {
            id: createId("donation"),
            userId: user.id,
            donorName: data.get("name").trim(),
            phone: data.get("phone").trim(),
            email: data.get("email").trim().toLowerCase(),
            foodType: data.get("food_type"),
            foodItems: data.get("food_items").trim(),
            quantity: Number(data.get("quantity")),
            packingAssistance: data.get("packing_assistance"),
            pickupAddress: data.get("address").trim(),
            pickupLatitude: data.get("pickup_latitude") ? Number(data.get("pickup_latitude")) : null,
            pickupLongitude: data.get("pickup_longitude") ? Number(data.get("pickup_longitude")) : null,
            pickupDate: data.get("pickup_date"),
            pickupTime: data.get("pickup_time"),
            status: "Pending",
            createdAt: new Date().toISOString()
        };
        if (!/^\+?[0-9\s-]{10,15}$/.test(donation.phone)) {
            showMessage(message, "Enter a valid phone number.", "error");
            return;
        }
        if (!Number.isFinite(donation.quantity) || donation.quantity <= 0) {
            showMessage(message, "Quantity must be greater than zero.", "error");
            return;
        }
        if (donation.pickupDate < new Date().toISOString().split("T")[0]) {
            showMessage(message, "Pickup date cannot be in the past.", "error");
            return;
        }
        const donations = getDonations();
        donations.unshift(donation);
        saveDonations(donations);
        showMessage(message, "Donation submitted successfully. Redirecting...", "success");
        window.setTimeout(() => { window.location.href = "userDashboard.html"; }, 700);
    });
}

function statusClass(status) {
    return status.toLowerCase().replace(/\s+/g, "-");
}

function statusBadge(status) {
    return `<span class="status ${statusClass(status)}">${status}</span>`;
}

function setupUserDashboard() {
    const tableBody = document.querySelector("#user-donations");
    if (!tableBody) {
        return;
    }
    const user = requireUser();
    if (!user) {
        return;
    }
    document.querySelector("#welcome-name").textContent = user.name;
    const donations = getDonations().filter((donation) => donation.userId === user.id);
    document.querySelector("#user-total").textContent = donations.length;
    document.querySelector("#user-pending").textContent = donations.filter((donation) => donation.status === "Pending").length;
    document.querySelector("#user-completed").textContent = donations.filter((donation) => donation.status === "Completed").length;
    if (!donations.length) {
        tableBody.innerHTML = `<tr><td class="empty-state" colspan="5">You have not submitted a donation yet. Your donation history will appear here.</td></tr>`;
        return;
    }
    tableBody.innerHTML = donations.map((donation) => `<tr>
        <td>${donation.id}</td><td>${donation.foodItems}<br><span class="muted">${donation.foodType}</span></td>
        <td>${donation.quantity}</td><td>${formatDate(donation.pickupDate)}</td><td>${statusBadge(donation.status)}</td>
    </tr>`).join("");
}

function setupAdminDashboard() {
    const donationBody = document.querySelector("#admin-donations");
    const userBody = document.querySelector("#admin-users");
    if (!donationBody || !userBody) {
        return;
    }
    const user = requireAdmin();
    if (!user) {
        return;
    }
    const render = () => {
        const donations = getDonations();
        const users = getUsers();
        document.querySelector("#admin-total-users").textContent = users.filter((item) => item.role === "user").length;
        document.querySelector("#admin-total-donations").textContent = donations.length;
        document.querySelector("#admin-pending").textContent = donations.filter((item) => item.status === "Pending").length;
        document.querySelector("#admin-completed").textContent = donations.filter((item) => item.status === "Completed").length;
        donationBody.innerHTML = donations.length ? donations.map((donation) => `<tr>
            <td>${donation.id}</td><td>${donation.donorName}<br><span class="muted">${donation.email}</span></td>
            <td>${donation.foodItems}<br>${donation.quantity}</td><td>${formatDate(donation.pickupDate)}<br>${donation.pickupTime}</td>
            <td><details><summary>View</summary><dl class="detail-list"><div><dt>Phone</dt><dd>${donation.phone}</dd></div><div><dt>Food type</dt><dd>${donation.foodType}</dd></div><div><dt>Packing</dt><dd>${donation.packingAssistance}</dd></div><div><dt>Address</dt><dd>${donation.pickupAddress}</dd></div>${Number.isFinite(donation.pickupLatitude) && Number.isFinite(donation.pickupLongitude) ? `<div><dt>Map pin</dt><dd><a href="https://www.openstreetmap.org/?mlat=${donation.pickupLatitude}&amp;mlon=${donation.pickupLongitude}#map=16/${donation.pickupLatitude}/${donation.pickupLongitude}" target="_blank" rel="noopener noreferrer">Open map</a></dd></div>` : ""}</dl></details></td>
            <td><select data-status-id="${donation.id}" aria-label="Change status for ${donation.id}">${STATUSES.map((status) => `<option ${status === donation.status ? "selected" : ""}>${status}</option>`).join("")}</select></td>
            <td><button class="danger" data-delete-id="${donation.id}" type="button">Delete</button></td>
        </tr>`).join("") : `<tr><td class="empty-state" colspan="7">No donation records yet.</td></tr>`;
        userBody.innerHTML = users.filter((item) => item.role === "user").length ? users.filter((item) => item.role === "user").map((item) => `<tr><td>${item.name}</td><td>${item.email}</td><td>${item.phone}</td><td>${item.role}</td></tr>`).join("") : `<tr><td class="empty-state" colspan="4">No registered users yet.</td></tr>`;
        donationBody.querySelectorAll("[data-status-id]").forEach((select) => select.addEventListener("change", () => {
            const updated = getDonations().map((donation) => donation.id === select.dataset.statusId ? { ...donation, status: select.value } : donation);
            saveDonations(updated);
            render();
        }));
        donationBody.querySelectorAll("[data-delete-id]").forEach((button) => button.addEventListener("click", () => {
            saveDonations(getDonations().filter((donation) => donation.id !== button.dataset.deleteId));
            render();
        }));
    };
    render();
}

document.addEventListener("DOMContentLoaded", () => {
    setupCommonPage();
    setupSignup();
    setupLogin();
    setupPickupMap();
    setupDonationForm();
    setupUserDashboard();
    setupAdminDashboard();
});