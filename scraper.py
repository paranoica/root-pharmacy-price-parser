import requests
from db import SessionLocal, ProductPriceLocal, ProductPriceCompetitor
from datetime import datetime
from config import MAIN_URL, COMPETITORS, COMPETITOR_URL

def fetch_main_products() -> dict:
    print("Updating prices from sanvivo.eu...")

    products = []

    resp = requests.get(MAIN_URL)
    data = resp.json()

    for item in data.get("items", []):
        products.append({
            "name": item["productname"] + " " + item["kultivar"],
            "price": float(item["price"]),

            "store": "Sanvivo",
            "image": item["image"],

            "thc": item["thc"],
            "cbd": item["cbd"],
            "availability": item["available"]
        })

    print("Updating prices from sanvivo finished.")
    return products

def fetch_competitor_products() -> dict:
    all_products = []

    for name, vend in COMPETITORS.items():
        print(f"Updating prices from {name}...")

        url = COMPETITOR_URL.format(page=1, vend=vend)

        resp = requests.get(url)
        data = resp.json()

        try:
            page_count = data["message"]["meta"]["pagination"]["pageCount"]
        except KeyError:
            page_count = 1

        for page in range(1, page_count + 1):
            url = COMPETITOR_URL.format(page=page, vend=vend)

            resp = requests.get(url)
            data = resp.json()

            items = data["message"]["data"]

            for item in items:
                all_products.append({
                    "name": item["name"],

                    "price": float(item["min_price"]),
                    "store": name,

                    "thc": item["thc"],
                    "cbd": item["cbd"],
                    "availability": item["availibility"]
                })

        print(f"Updating prices from {name} finished.")

    return all_products

def save_main_products(products) -> None:
    session = SessionLocal()
    now = datetime.now()

    print("Saving sanvivo prices...")

    for prod in products:
        last = session.query(ProductPriceLocal)\
            .filter_by(product_name=prod["name"], store_name=prod["store"], valid_to=None)\
            .order_by(ProductPriceLocal.valid_from.desc()).first()

        if last:
            if last.price != prod["price"]:
                last.valid_to = now
                new_item = ProductPriceLocal(
                    product_name=prod["name"],
                    store_name=prod["store"],

                    price=prod["price"],
                    image=prod["image"],

                    thc=prod["thc"],
                    cbd=prod["cbd"],

                    valid_from=now,
                    availability=prod["availability"]
                )
                
                session.add(new_item)
        else:
            new_item = ProductPriceLocal(
                product_name=prod["name"],
                store_name=prod["store"],

                price=prod["price"],
                image=prod["image"],

                thc=prod["thc"],
                cbd=prod["cbd"],

                valid_from=now,
                availability=prod["availability"]
            )

            session.add(new_item)

    session.commit()
    session.close()

    print("Saving sanvivo prices finished.")

def save_competitor_products(products) -> None:
    session = SessionLocal()
    now = datetime.now()

    for prod in products:
        last = session.query(ProductPriceCompetitor)\
            .filter_by(product_name=prod["name"], store_name=prod["store"], valid_to=None)\
            .order_by(ProductPriceCompetitor.valid_from.desc()).first()

        if last:
            if last.price != prod["price"]:
                last.valid_to = now
                new_item = ProductPriceCompetitor(
                    product_name=prod["name"],
                    store_name=prod["store"],

                    price=prod["price"],
                    thc=prod["thc"],
                    cbd=prod["cbd"],

                    valid_from=now,
                    availability=prod["availability"]
                )

                session.add(new_item)
        else:
            new_item = ProductPriceCompetitor(
                product_name=prod["name"],
                store_name=prod["store"],

                price=prod["price"],
                thc=prod["thc"],
                cbd=prod["cbd"],

                valid_from=now,
                availability=prod["availability"]
            )
            session.add(new_item)

    session.commit()
    session.close()
    
    print("Saving competitor prices finished.")