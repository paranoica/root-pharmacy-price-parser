document.addEventListener("DOMContentLoaded", () => {
    const dropdowns = gsap.utils.toArray(".dropdown"); dropdowns.forEach(drop => {
        const button = drop.querySelector(".dropbtn");
        const content = drop.querySelector(".dropdown-content");

        content.style.overflow = "hidden";
        drop.isOpen = false;

        drop.selectedItem = content.querySelector(".item");
        drop.selectedItem.classList.add("selected");

        button.addEventListener("click", (e) => {
            e.stopPropagation(); dropdowns.forEach(d => {
                if (d !== drop && d.isOpen)
                    closeDropdown(d);
            }
            );

            drop.isOpen ? closeDropdown(drop) : openDropdown(drop);
        });

        content.querySelectorAll(".item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation(); if (drop.selectedItem)
                    drop.selectedItem.classList.remove("selected");

                drop.selectedItem = item;
                item.classList.add("selected");

                gsap.to(button, {
                    opacity: 0, duration: 0.25, ease: "power3.out", onComplete: () => {
                        button.textContent = item.textContent + " ▾";
                        gsap.to(button, { opacity: 1, duration: 0.25, ease: "power3.out" });
                    }
                });

                closeDropdown(drop);
            });
        });
    });

    function openDropdown(drop) {
        const content = drop.querySelector(".dropdown-content");

        drop.isOpen = true; let maxWidth = Array.from(content.children).reduce((max, el) => {
            return Math.max(max, el.scrollWidth);
        }, 0);

        content.style.minWidth = maxWidth + "px";
        content.style.display = "flex";

        const height = content.scrollHeight; gsap.fromTo(content,
            { height: 0 },
            { height: height, duration: 0.3, ease: "power3.out", onComplete: () => { content.style.height = "auto"; } }
        );

        gsap.fromTo(content.children,
            { y: -10, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.05, duration: 0.2, ease: "power3.out" }
        );
    }

    function closeDropdown(drop) {
        const content = drop.querySelector(".dropdown-content");

        drop.isOpen = false; gsap.to(content.children, {
            y: -10, opacity: 0, stagger: 0.05, duration: 0.15
        });

        gsap.to(content, {
            height: 0, duration: 0.3, ease: "power3.inOut", onComplete: () => {
                content.style.display = "none";
                content.style.height = "auto";
            }
        });
    }

    document.addEventListener("click", () => {
        dropdowns.forEach(drop => {
            if (drop.isOpen)
                closeDropdown(drop);
        });
    });

    let isVisible = false;
    const scrollBtn = document.getElementById("scroll-top-btn");

    gsap.set(scrollBtn, {
        opacity: 0,
        y: 50,
        pointerEvents: "none"
    });

    function showScrollBtn() {
        if (!isVisible) {
            gsap.to(scrollBtn, {
                duration: 0.5,
                opacity: 1,
                y: 0,
                pointerEvents: "auto",
                ease: "power2.inOut"
            });
            isVisible = true;
        }
    }

    function hideScrollBtn() {
        if (isVisible) {
            gsap.to(scrollBtn, {
                duration: 0.5,
                opacity: 0,
                y: 50,
                pointerEvents: "none",
                ease: "power2.inOut"
            });
            isVisible = false;
        }
    }

    window.addEventListener("scroll", () => {
        if (window.scrollY > 200)
            showScrollBtn();
        else
            hideScrollBtn();
    });

    scrollBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    const modal = document.getElementById("card-modal");
    let chartInstance = null;

    const modalBody = document.getElementById("modal-body");
    const modalClose = document.getElementById("modal-close");

    const graphContainer = document.getElementById("graph-container");
    const cardsContainer = document.querySelector(".cards-container");

    function loadPriceHistory(productName, storeName) {
        fetch(`/api/product-history?name=${encodeURIComponent(productName)}&store=${encodeURIComponent(storeName)}`).then(res => res.json()).then(data => {
            data.sort((a, b) => new Date(a.valid_from) - new Date(b.valid_from));

            const labels = data.map(p => new Date(p.valid_from).toLocaleDateString("en-GB"));
            const prices = data.map(p => p.price);

            if (chartInstance)
                chartInstance.destroy();

            const canvas = document.createElement("canvas");

            graphContainer.innerHTML = "";
            graphContainer.appendChild(canvas);

            chartInstance = new Chart(canvas, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Price (€) — ${storeName}`,
                        data: prices,
                        borderColor: "#4ade80",
                        backgroundColor: "rgba(222, 233, 226, 0.2)",
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { title: { display: true, text: "Date" } },
                        y: { title: { display: true, text: "Price (€)" } }
                    }
                }
            });
        }).catch(err => {
            console.error("Error loading price history:", err);
        });
    }

    async function openModal(card) {
        modalBody.innerHTML = card.innerHTML;
        modal.style.display = "flex";

        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" });
        gsap.fromTo(modalBody, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.inOut" });
        gsap.fromTo(graphContainer, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.inOut" });

        const productName = card.querySelector(".name")?.textContent.trim() || "";
        const storeElement = card.querySelector(".store");
        const priceElement = modalBody.querySelector(".price");

        const quantityText = modalBody.querySelector(".quantity-text");
        const quantityCircle = modalBody.querySelector(".quantity-circle");

        if (!productName || !priceElement)
            return;

        const storeText = storeElement?.textContent || ""; if (storeText.includes(",")) {
            const storeNames = storeText.split(",").map(s => s.trim());

            const dropdownContainer = document.createElement("div");
            dropdownContainer.classList.add("similar-dropdown"); dropdownContainer.style.marginTop = "20px";

            const label = document.createElement("label");
            label.textContent = "Select store: "; label.style.marginRight = "6px";

            const select = document.createElement("select");
            const allOption = document.createElement("option");
            const modalStoreElement = modalBody.querySelector(".store");

            allOption.value = "All"; allOption.textContent = "All";
            select.appendChild(allOption);

            storeNames.forEach(name => {
                const option = document.createElement("option");
                option.value = name; option.textContent = name;

                select.appendChild(option);
            });

            dropdownContainer.appendChild(label);
            dropdownContainer.appendChild(select);
            modalBody.appendChild(dropdownContainer);

            async function updateModalPrice(storeName) {
                let availabilityText = "";
                let availabilityColor = "";

                if (storeName === "All") {
                    try {
                        availabilityText = "Unknown";
                        availabilityColor = "black";

                        const priceResults = await Promise.all(
                            storeNames.map(async name => {
                                const res = await fetch(`/api/product-history?name=${encodeURIComponent(productName)}&store=${encodeURIComponent(name)}`);
                                const data = await res.json();

                                if (Array.isArray(data) && data.length > 0) {
                                    const latest = data[data.length - 1];
                                    return `€${parseFloat(latest.price).toFixed(2)}`;
                                }

                                return "N/A";
                            })
                        );

                        priceElement.innerHTML = priceResults.join(", ");
                        modalStoreElement.textContent = storeNames.join(", ");

                        if (priceResults.includes("No data")) {
                            graphContainer.innerHTML = `<p style="text-align:center; color:#999;">Graph unavailable due to null data</p>`;
                        } else {
                            graphContainer.innerHTML = `<p style="text-align:center; color:#999;">Graph unavailable for multiple stores</p>`;
                        }
                    } catch (err) {
                        console.error("Error fetching prices for All:", err);
                        graphContainer.innerHTML = `<p style="text-align:center; color:#999;">Graph unavailable</p>`;
                    }
                } else {
                    try {
                        const res = await fetch(`/api/product-history?name=${encodeURIComponent(productName)}&store=${encodeURIComponent(storeName)}`);
                        const data = await res.json();

                        if (Array.isArray(data) && data.length > 0) {
                            const latest = data[data.length - 1];

                            const price = parseFloat(latest.price).toFixed(2);
                            const avialability = Number(latest.availability);

                            priceElement.innerHTML = `€${price}`;
                            modalStoreElement.textContent = storeName;

                            switch (avialability) {
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

                            loadPriceHistory(productName, storeName);
                        } else {
                            availabilityText = "Unknown", availabilityColor = "black";
                            priceElement.innerHTML = `<span style="color:#999;">No data</span>`;
                            modalStoreElement.innerHTML = `<span style="color:#999;">No data</span>`;
                            graphContainer.innerHTML = `<p style="text-align:center; color:#999;">Graph unavailable for this store</p>`;
                        }
                    } catch (err) {
                        console.error("Error fetching product price:", err);
                        availabilityText = "Unknown", availabilityColor = "black";
                        graphContainer.innerHTML = `<p style="text-align:center; color:#999;">Graph unavailable for this store</p>`;
                    }
                }

                quantityText.textContent = availabilityText;
                quantityText.style.color = availabilityColor;
                quantityCircle.style.backgroundColor = availabilityColor;
            }

            select.addEventListener("change", async () => {
                const selectedStore = select.value;
                await updateModalPrice(selectedStore);
            });

            await updateModalPrice("All");
        } else {
            const singleStore = storeText || "Sanvivo";
            loadPriceHistory(productName, singleStore);
        }
    }

    function closeModal() {
        gsap.to(modalBody, {
            scale: 0.95,
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut"
        });

        gsap.to(graphContainer, {
            scale: 0.95,
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut"
        });

        gsap.to(modal, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut",

            onComplete: () => {
                modal.style.display = "none";
                modalBody.innerHTML = "";
            }
        });
    }

    cardsContainer.addEventListener("click", (e) => {
        const card = e.target.closest(".card"); if (!card)
            return;

        openModal(card);
    });

    modalClose.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    gsap.fromTo(
        document.body,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: "power3.out" }
    );
});