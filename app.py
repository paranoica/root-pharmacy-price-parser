from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from db import init_db, SessionLocal, ProductPriceLocal, ProductPriceCompetitor
from scraper import fetch_main_products, fetch_competitor_products, save_main_products, save_competitor_products
from config import UPDATE_INTERVAL_MINUTES, UPDATE_IN_THE_FIRST_LOAD
from threading import Thread
from rapidfuzz import fuzz

app = Flask(__name__)
scheduler = BackgroundScheduler()

CORS(app)
init_db()

def update_prices() -> None:
    print("Global update started...")

    main_products = fetch_main_products()
    save_main_products(main_products)

    competitor_products = fetch_competitor_products()
    save_competitor_products(competitor_products)

    print("Global update finished.")

scheduler.add_job(update_prices, "interval", minutes=UPDATE_INTERVAL_MINUTES, next_run_time=datetime.now() + timedelta(seconds=UPDATE_IN_THE_FIRST_LOAD))
scheduler.start()

@app.route("/")
def index() -> None:
    return render_template("index.html")

def get_latest_prices(model, days=None) -> dict:
    session = SessionLocal()
    query = session.query(model)

    if days:
        cutoff = datetime.now() - timedelta(days=days)
        query = query.filter(model.valid_from >= cutoff)

    # query = query.filter(model.valid_to.is_(None))

    data = query.all()
    session.close()

    return data


@app.route("/api/force-update", methods=["POST"])
def force_update():
    try:
        thread = Thread(target=update_prices)
        thread.start()
        thread.join()
        return jsonify({"status": "success", "message": "Prices updated"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/products")
def get_products() -> str:
    store_filter = request.args.get("store", "All")
    sort_filter = request.args.get("sort", "ascending")

    all_local = get_latest_prices(ProductPriceLocal)
    all_competitors = get_latest_prices(ProductPriceCompetitor)

    products = []
    latest_items = {}
    all_items = all_local + all_competitors

    for item in all_items:
        key = (item.product_name, item.store_name)
        if item.valid_to is None:
            latest_items[key] = item

    for key, item in latest_items.items():
        old_version = next(
            (x for x in all_items if x.product_name == item.product_name and x.store_name == item.store_name and x.valid_to == item.valid_from),
            None
        )

        price_diff = None
        if old_version:
            price_diff = item.price - old_version.price

        if isinstance(item, ProductPriceLocal):
            availability = 0 if item.availability else 4 # True = (0) available, False = (4) not available
        else:
            mapping = {
                0: 1,  # sofort lieferbar
                1: 2,  # lieferbar
                2: 3,  # restbestand
                3: 4,  # unavailable
            }

            availability = mapping.get(item.availability, 4)

        products.append({
            "name": item.product_name,
            "store": item.store_name,
            "price": item.price,
            "image": getattr(item, "image", None),
            "thc": item.thc,
            "cbd": item.cbd,
            "valid_from": item.valid_from.isoformat(),
            "valid_to": item.valid_to.isoformat() if item.valid_to else None,
            "price_diff": price_diff,
            "availability": availability
        })

    if store_filter == "Sanvivo":
        products = [p for p in products if p["store"] == "Sanvivo"]
    elif store_filter == "Competitors":
        products = [p for p in products if p["store"] != "Sanvivo"]
    elif store_filter == "Similar":
        sanvivo_products = [p for p in products if p["store"] == "Sanvivo"]
        competitor_products = [p for p in products if p["store"] != "Sanvivo"]
        grouped = []

        for s_product in sanvivo_products:
            identical_group = [s_product]
            for c_product in competitor_products:
                if (fuzz.ratio(s_product["name"], c_product["name"]) == 100 and s_product["thc"] == c_product["thc"] and s_product["cbd"] == c_product["cbd"]):
                    identical_group.append(c_product)

            if len(identical_group) > 1:
                avg_price = sum(p["price"] for p in identical_group) / len(identical_group)
                sanvivo_price = s_product["price"]

                grouped.append({
                    "name": s_product["name"],
                    "store": ", ".join(sorted(set(p["store"] for p in identical_group))),
                    "price": f"{sanvivo_price}, {avg_price:.2f}",
                    "image": s_product["image"],
                    "thc": s_product["thc"],
                    "cbd": s_product["cbd"],
                    "valid_from": s_product["valid_from"],
                    "availability": s_product["availability"]
                })
        products = grouped

    if sort_filter == "ascending":
        products.sort(key=lambda x: x["price"])
    elif sort_filter == "descending":
        products.sort(key=lambda x: x["price"], reverse=True)
    elif sort_filter == "time_updated":
        products.sort(key=lambda x: datetime.fromisoformat(x["valid_from"]), reverse=True)
    elif sort_filter == "thc_asc":
        products.sort(key=lambda x: x.get("thc", 0))
    elif sort_filter == "thc_desc":
        products.sort(key=lambda x: x.get("thc", 0), reverse=True)
    elif sort_filter == "cbd_asc":
        products.sort(key=lambda x: x.get("cbd", 0))
    elif sort_filter == "cbd_desc":
        products.sort(key=lambda x: x.get("cbd", 0), reverse=True)

    similar_stores = []
    if store_filter == "Similar":
        for group in products:
            for s in group["store"].split(", "):
                if s not in similar_stores:
                    similar_stores.append(s)

    response = {
        "products": products,
        "similar_stores": similar_stores
    }
    
    return jsonify(response)

@app.route("/api/product-history")
def product_history():
    name = request.args.get("name")
    store = request.args.get("store")

    session = SessionLocal()

    local_history = session.query(ProductPriceLocal)\
        .filter(ProductPriceLocal.product_name == name,
                ProductPriceLocal.store_name == store)\
        .order_by(ProductPriceLocal.valid_from).all()

    competitor_history = session.query(ProductPriceCompetitor)\
        .filter(ProductPriceCompetitor.product_name == name,
                ProductPriceCompetitor.store_name == store)\
        .order_by(ProductPriceCompetitor.valid_from).all()

    session.close()

    history = local_history + competitor_history

    result = []
    for item in history:
        result.append({
            "price": item.price,
            "availability": item.availability,
            "valid_from": item.valid_from.isoformat(),
            "valid_to": item.valid_to.isoformat() if item.valid_to else None
        })

    result.sort(key=lambda x: x["valid_from"])
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=False)