from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class BidPackage(Base):
    __tablename__ = "bid_packages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contractors = relationship("Contractor", back_populates="bid_package")

class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    gemini_store_name = Column(String, nullable=True)
    bid_package_id = Column(Integer, ForeignKey("bid_packages.id"))

    bid_package = relationship("BidPackage", back_populates="contractors")
    evaluation_results = relationship("EvaluationResult", back_populates="contractor")
    files = relationship("ContractorFile", back_populates="contractor")

class ContractorFile(Base):
    __tablename__ = "contractor_files"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"))
    filename = Column(String)
    file_path = Column(String)
    gemini_file_name = Column(String, nullable=True)
    gemini_file_uri = Column(String, nullable=True)
    is_stored_in_gemini = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    contractor = relationship("Contractor", back_populates="files")

class CriteriaSet(Base):
    __tablename__ = "criteria_sets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    prompts = Column(JSON)  # List of criteria prompts

class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"))
    criteria_id = Column(Integer, nullable=True) # Optional link if we want to track specific criteria ID from the JSON
    criteria_prompt = Column(Text) # Store the prompt text used
    score = Column(Integer)
    comment = Column(Text)
    evidence = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    contractor = relationship("Contractor", back_populates="evaluation_results")
