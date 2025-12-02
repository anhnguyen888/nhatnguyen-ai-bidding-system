from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import json
import time
import uuid
from . import models, database, services
from pydantic import BaseModel

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Models
class BidPackageCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ContractorCreate(BaseModel):
    name: str
    bid_package_id: int

class CriteriaSetCreate(BaseModel):
    name: str
    prompts: List[str]

# Routes

@app.post("/bid_packages/")
def create_bid_package(bid: BidPackageCreate, db: Session = Depends(get_db)):
    db_bid = models.BidPackage(name=bid.name, description=bid.description)
    db.add(db_bid)
    db.commit()
    db.refresh(db_bid)
    return db_bid

@app.get("/bid_packages/")
def list_bid_packages(db: Session = Depends(get_db)):
    return db.query(models.BidPackage).all()

@app.put("/bid_packages/{bid_id}")
def update_bid_package(bid_id: int, bid: BidPackageCreate, db: Session = Depends(get_db)):
    db_bid = db.query(models.BidPackage).filter(models.BidPackage.id == bid_id).first()
    if not db_bid:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói thầu")
    db_bid.name = bid.name
    if bid.description:
        db_bid.description = bid.description
    db.commit()
    db.refresh(db_bid)
    return db_bid

@app.delete("/bid_packages/{bid_id}")
def delete_bid_package(bid_id: int, db: Session = Depends(get_db)):
    db_bid = db.query(models.BidPackage).filter(models.BidPackage.id == bid_id).first()
    if not db_bid:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói thầu")
    
    # Delete all contractors and their stores first
    contractors = db.query(models.Contractor).filter(models.Contractor.bid_package_id == bid_id).all()
    for contractor in contractors:
        if contractor.gemini_store_name:
            services.delete_store(contractor.gemini_store_name)
        # Delete files from DB (and maybe local FS? keeping it simple for now)
        db.query(models.ContractorFile).filter(models.ContractorFile.contractor_id == contractor.id).delete()
        db.query(models.EvaluationResult).filter(models.EvaluationResult.contractor_id == contractor.id).delete()
        db.delete(contractor)
        
    db.delete(db_bid)
    db.commit()
    return {"status": "success", "message": "Đã xóa gói thầu và dữ liệu liên quan"}

@app.post("/contractors/")
def create_contractor(contractor: ContractorCreate, db: Session = Depends(get_db)):
    db_contractor = models.Contractor(name=contractor.name, bid_package_id=contractor.bid_package_id)
    db.add(db_contractor)
    db.commit()
    db.refresh(db_contractor)
    return db_contractor

@app.get("/bid_packages/{bid_id}/contractors")
def list_contractors(bid_id: int, db: Session = Depends(get_db)):
    return db.query(models.Contractor).filter(models.Contractor.bid_package_id == bid_id).all()

@app.put("/contractors/{contractor_id}")
def update_contractor(contractor_id: int, contractor: ContractorCreate, db: Session = Depends(get_db)):
    db_contractor = db.query(models.Contractor).filter(models.Contractor.id == contractor_id).first()
    if not db_contractor:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu")
    db_contractor.name = contractor.name
    db.commit()
    db.refresh(db_contractor)
    return db_contractor

@app.delete("/contractors/{contractor_id}")
def delete_contractor(contractor_id: int, db: Session = Depends(get_db)):
    db_contractor = db.query(models.Contractor).filter(models.Contractor.id == contractor_id).first()
    if not db_contractor:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu")
    
    # Delete Gemini store
    if db_contractor.gemini_store_name:
        services.delete_store(db_contractor.gemini_store_name)
        
    # Delete related data
    db.query(models.ContractorFile).filter(models.ContractorFile.contractor_id == contractor_id).delete()
    db.query(models.EvaluationResult).filter(models.EvaluationResult.contractor_id == contractor_id).delete()
    
    db.delete(db_contractor)
    db.commit()
    return {"status": "success", "message": "Đã xóa nhà thầu và dữ liệu liên quan"}

@app.post("/upload_file/")
async def upload_file(file: UploadFile = File(...)):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename, "path": file_path}

@app.post("/contractors/{contractor_id}/process-files")
async def process_contractor_files(
    contractor_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # Fetch contractor
    contractor = db.query(models.Contractor).filter(models.Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu")

    # 1. Save uploaded files locally & Upload to Gemini
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    uploaded_file_records = [] # List of (db_file, gemini_file)
    
    for file in files:
        # Use UUID for safe local filename
        file_extension = os.path.splitext(file.filename)[1]
        safe_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create DB record
        db_file = models.ContractorFile(
            contractor_id=contractor_id,
            filename=file.filename,
            file_path=file_path,
            is_stored_in_gemini=False
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        # Upload to Gemini
        try:
            g_file = services.upload_file(file_path, mime_type=file.content_type, display_name=file.filename)
            
            # Update DB record
            db_file.gemini_file_name = g_file.name
            db_file.gemini_file_uri = g_file.uri
            db.commit()
            
            uploaded_file_records.append((db_file, g_file))
        except Exception as e:
            # If one fails, we continue but log/warn? For now, fail hard to ensure integrity
            raise HTTPException(status_code=500, detail=f"Tải lên Gemini thất bại cho {file.filename}: {str(e)}")

    # 2. Manage RAG Store
    rag_store_name = contractor.gemini_store_name
    gemini_files_to_add = [g for _, g in uploaded_file_records]
    
    if rag_store_name:
        # Store exists, add new files
        if gemini_files_to_add:
            try:
                for g_file in gemini_files_to_add:
                    services.add_file_to_store(rag_store_name, g_file.name)
                
                # Update status
                for db_file, _ in uploaded_file_records:
                    db_file.is_stored_in_gemini = True
                db.commit()

                # Wait for indexing
                time.sleep(5)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Không thể thêm tệp vào kho hiện có: {str(e)}")
    else:
        # No store exists, create new one
        if gemini_files_to_add:
            store_display_name = f"evaluation_{contractor_id}_{int(time.time())}"
            try:
                rag_store_name = services.create_store_with_files(store_display_name, [f.name for f in gemini_files_to_add])
                
                # Update contractor with store name
                contractor.gemini_store_name = rag_store_name
                
                # Update status
                for db_file, _ in uploaded_file_records:
                    db_file.is_stored_in_gemini = True
                db.commit()
                
                # Wait for indexing
                time.sleep(5)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Tạo kho RAG thất bại: {str(e)}")
        else:
             raise HTTPException(status_code=400, detail="Không có tệp nào để xử lý.")

    return {"status": "success", "message": f"Đã xử lý {len(files)} tệp và cập nhật RAG store"}

@app.post("/evaluate/")
async def evaluate_contractor(
    contractor_id: int = Form(...),
    prompts: str = Form(...), # Expecting JSON string for list of prompts
    db: Session = Depends(get_db)
):
    # Fetch contractor to check for existing store
    contractor = db.query(models.Contractor).filter(models.Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu")
    
    rag_store_name = contractor.gemini_store_name
    if not rag_store_name:
        raise HTTPException(status_code=400, detail="Nhà thầu chưa có dữ liệu RAG. Vui lòng tải lên và xử lý tệp trước.")

    # 3. Evaluate each prompt
    results = []
    # Parse prompts
    try:
        prompt_list = json.loads(prompts)
        if not isinstance(prompt_list, list):
             raise ValueError("Prompts must be a list")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Định dạng lời nhắc không hợp lệ: {str(e)}")

    for prompt in prompt_list:
        try:
            eval_text = services.evaluate_criteria(rag_store_name, prompt)
            
            # Simple parsing of score (assuming the model follows instruction)
            # In a real app, we might ask for JSON output from Gemini for easier parsing
            score = 0
            comment = eval_text
            
            # Save to DB
            db_result = models.EvaluationResult(
                contractor_id=contractor_id,
                criteria_prompt=prompt,
                score=score, # Placeholder
                comment=comment,
                evidence=""
            )
            db.add(db_result)
            results.append({"prompt": prompt, "result": eval_text})
        except Exception as e:
            results.append({"prompt": prompt, "error": str(e)})

    db.commit()
    return {"status": "Đánh giá hoàn tất", "results": results}

@app.get("/contractors/{contractor_id}/files")
def list_contractor_files(contractor_id: int, db: Session = Depends(get_db)):
    return db.query(models.ContractorFile).filter(models.ContractorFile.contractor_id == contractor_id).all()

@app.get("/evaluations/{contractor_id}")
def get_evaluations(contractor_id: int, db: Session = Depends(get_db)):
    return db.query(models.EvaluationResult).filter(models.EvaluationResult.contractor_id == contractor_id).all()

@app.get("/")
def read_root():
    return {"message": "API Backend Hệ thống Đấu thầu AI"}
