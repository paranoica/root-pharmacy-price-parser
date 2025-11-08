let currentStore = "All";
let currentSort = "ascending";

const batchSize = 10;
let allProductsб = [], displayedCount = 0;

function renderBatch() {
    const fragment = document.createDocumentFragment();
    const container = document.querySelector(".cards-container");
    const nextBatch = allProducts.slice(displayedCount, displayedCount + batchSize);

    nextBatch.forEach(p => {
        const card = document.createElement("div");

        let availabilityText = "";
        let availabilityColor = "";

        switch (p.availability) {
            case 0:
                availabilityText = "Available";
                availabilityColor = "green";
                break;
            case 1:
                availabilityText = "Very much";
                availabilityColor = "limegreen";
                break;
            case 2:
                availabilityText = "In stock";
                availabilityColor = "green";
                break;
            case 3:
                availabilityText = "Few left";
                availabilityColor = "orange";
                break;
            case 4:
                availabilityText = "Unavailable";
                availabilityColor = "red";
                break;
            default:
                availabilityText = "Unknown";
                availabilityColor = "black";
        }

        const is_image_valid = p.image && p.image.startsWith("https");
        const imageUrl = is_image_valid ? p.image : "/static/unknown_product.svg";

        const priceStr = String(p.price);
        let priceHTML = ""; let priceChangeHTML = "";

        if (priceStr.includes(",")) {
            const priceParts = priceStr.split(",");
            const ourPrice = parseFloat(priceParts[0]).toFixed(2);
            const avgPrice = parseFloat(priceParts[1]).toFixed(2);

            priceHTML = `€${ourPrice}, AVG: €${avgPrice}`;
        } else {
            priceHTML = `€${parseFloat(priceStr).toFixed(2)}`;
        }

        if (p.price_diff !== null && p.price_diff !== 0) {
            if (p.price_diff > 0) priceChangeHTML = ` <span class="price-up">▲ €${p.price_diff.toFixed(2)}</span>`;
            else if (p.price_diff < 0) priceChangeHTML = ` <span class="price-down">▼ €${Math.abs(p.price_diff).toFixed(2)}</span>`;
        }

        const utcDate = new Date(p.valid_from);
        const formattedDate = utcDate.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "UTC"
        });

        card.classList.add("card");
        card.innerHTML = `
            <div class="quantity-container">
                <div class="quantity-circle" style="background-color:${availabilityColor};"></div>
                <div class="quantity-text" style="color:${availabilityColor};">${availabilityText}</div>
            </div>

            <img src="${imageUrl}" alt="${p.name}" loading="lazy" style="filter: blur(${!is_image_valid ? 0 : 3}px)">
            <div class="name">${p.name}</div>
            <div class="store">${p.store}</div>
            <div class="price">${priceHTML}${priceChangeHTML}</div>
            <div class="utc-time">Last update: ${formattedDate}</div>
            <div class="sliders">
                <div class="slider-group">
                    <div class="slider-label">
                        <div class="slider-name">THC</div>
                        <div class="slider-value thc-value">${p.thc ?? 0}%</div>
                    </div>
                    <div class="bar-container">
                        <div class="bar thc-bar" style="width: ${p.thc ?? 0}%"></div>
                    </div>
                </div>
                <div class="slider-group">
                    <div class="slider-label">
                        <div class="slider-name">CBD</div>
                        <div class="slider-value cbd-value">${p.cbd ?? 0}%</div>
                    </div>
                    <div class="bar-container">
                        <div class="bar cbd-bar" style="width: ${p.cbd ?? 0}%"></div>
                    </div>
                </div>
            </div>
        `;

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
    displayedCount += nextBatch.length;

    const loadMoreBtn = document.getElementById("load-more-btn"); if (displayedCount < allProducts.length)
        loadMoreBtn.style.display = "block";
    else
        loadMoreBtn.style.display = "none";
}

function loadProducts() {
    fetch(`/api/products?store=${currentStore}&sort=${currentSort}`).then(res => res.json()).then(data => {
        allProducts = data.products || data; if (currentStore === "Similar" && data.similar_stores) {
            const stores = data.similar_stores;
            const dropdown = document.getElementById("store-filter");

            stores.forEach(store => {
                const item = document.createElement("div");

                item.classList.add("item");
                item.textContent = store;

                item.addEventListener("click", () => {
                    currentStore = store;
                    dropdown.querySelector(".dropbtn").textContent = `${store} ▾`;
                    loadProducts();
                });
            });
        }

        displayedCount = 0;
        document.querySelector(".cards-container").innerHTML = "";

        renderBatch();
    });
}

document.getElementById("load-more-btn").addEventListener("click", () => {
    renderBatch();
});

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();

    const updateBtn = document.querySelector(".update-btn"); updateBtn.addEventListener("click", async () => {
        updateBtn.style.pointerEvents = "none";
        updateBtn.innerHTML = '<span class="spinner"></span>';
        updateBtn.style.cursor = "not-allowed";

        try {
            const res = await fetch("/api/force-update", { method: "POST" });
            const data = await res.json();

            if (data.status === "success")
                loadProducts();
            else
                console.error("Update failed:", data.message);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            updateBtn.disabled = false;
            updateBtn.textContent = "Update";
            updateBtn.style.cursor = "pointer";
            updateBtn.style.pointerEvents = "auto";
        }
    });

    document.querySelectorAll("#store-filter .item").forEach(item => {
        item.addEventListener("click", () => {
            currentStore = item.textContent.trim();
            document.querySelector("#store-filter .dropbtn").textContent = `${currentStore} ▾`;

            loadProducts();
        });
    });

    document.querySelectorAll("#sort-filter .item").forEach(item => {
        item.addEventListener("click", () => {
            const text = item.textContent.trim();

            document.querySelector("#sort-filter .dropbtn").textContent = `${text} ▾`;

            if (text === "In ascending") currentSort = "ascending";
            else if (text === "By descending") currentSort = "descending";
            else if (text === "THC ascending") currentSort = "thc_asc";
            else if (text === "THC descending") currentSort = "thc_desc";
            else if (text === "CBD ascending") currentSort = "cbd_asc";
            else if (text === "CBD descending") currentSort = "cbd_desc";
            else if (text === "Last price update") currentSort = "time_updated";

            loadProducts();
        });
    });
});