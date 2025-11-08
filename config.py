UPDATE_INTERVAL_MINUTES = 60
UPDATE_IN_THE_FIRST_LOAD = 0.05

POSTGRES = {
    "user": "postgres",
    "password": "dev",
    "host": "localhost",
    "port": 5432,
    "database": "price-watcher"
}

MAIN_URL = "https://sanvivo-cannabis-apotheke.de/api/products?limit=9999&offset=0"
COMPETITOR_URL = "https://cannaleo.de/api/products?pagination%5Bpage%5D={page}&pagination%5BpageSize%5D=12&vend={vend}"

COMPETITORS = {
    "asavita.de": 81,
    "cannabis.hohenzollern-apotheke.de": 20,
    #"thcundco.de": 57
}

# all sites from cannaleo has the same api url, except vend (which means vendor)