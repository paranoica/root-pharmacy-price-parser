from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import POSTGRES
from datetime import datetime

DATABASE_URL = f"postgresql://{POSTGRES["user"]}:{POSTGRES["password"]}@{POSTGRES["host"]}:{POSTGRES["port"]}/{POSTGRES["database"]}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class ProductPriceLocal(Base):
    __tablename__ = "product_prices_local"
    id = Column(Integer, primary_key=True, index=True)

    product_name = Column(String, index=True)
    store_name = Column(String)

    price = Column(Float)
    image = Column(String, nullable=True)

    thc = Column(Float)
    cbd = Column(Float)
    availability = Column(Boolean)

    valid_from = Column(DateTime, default=datetime.now)
    valid_to = Column(DateTime, nullable=True)

class ProductPriceCompetitor(Base):
    __tablename__ = "product_prices_competitors"
    id = Column(Integer, primary_key=True, index=True)

    product_name = Column(String, index=True)
    store_name = Column(String)
    price = Column(Float)

    thc = Column(Float)
    cbd = Column(Float)
    availability = Column(Integer)
    
    valid_from = Column(DateTime, default=datetime.now)
    valid_to = Column(DateTime, nullable=True)

def init_db() -> None:
    #Base.metadata.drop_all(bind=engine) # for updating database rows
    Base.metadata.create_all(bind=engine)