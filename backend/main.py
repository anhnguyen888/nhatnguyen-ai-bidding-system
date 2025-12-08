from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import json
import time
import uuid
import re
from . import models, database, services, auth
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm

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

class UserCreate(BaseModel):
    username: str
    full_name: Optional[str] = None
    password: str
    role: str = "user"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    is_active: bool
    role: str

    class Config:
        orm_mode = True

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Routes

@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if not user:
            hashed_password = auth.get_password_hash("admin123")
            db_user = models.User(username="admin", hashed_password=hashed_password, role="admin")
            db.add(db_user)
            db.commit()
            print("Admin user created")
    finally:
        db.close()

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, full_name=user.full_name, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.password:
        db_user.hashed_password = auth.get_password_hash(user.password)
    if user.full_name is not None:
        db_user.full_name = user.full_name
    if user.is_active is not None:
        db_user.is_active = user.is_active
    if user.role:
        db_user.role = user.role
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/users/me/password")
async def change_password(password_data: PasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    if not auth.verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")

    # Re-query user in current session to ensure it's tracked
    db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.hashed_password = auth.get_password_hash(password_data.new_password)
    db.commit()
    db.refresh(db_user)
    return {"status": "success", "message": "Đổi mật khẩu thành công"}

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản đang đăng nhập")
    db.delete(db_user)
    db.commit()
    return {"status": "success", "message": "User deleted"}

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
        # Use placeholder for local path since we are not saving locally
        # We still generate a safe filename for the display_name or potential future use
        file_extension = os.path.splitext(file.filename)[1]
        safe_filename = f"{uuid.uuid4()}{file_extension}"
        # Use a special scheme to indicate it's not on disk
        file_path = f"memory://{safe_filename}"
        
        # Create DB record
        db_file = models.ContractorFile(
            contractor_id=contractor_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file.size, # Save file size
            is_stored_in_gemini=False
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        # Upload to Gemini
        try:
            # Pass the file-like object directly
            g_file = services.upload_file(file.file, mime_type=file.content_type, display_name=file.filename)
            
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
            eval_result = services.evaluate_criteria(rag_store_name, prompt)
            eval_text = eval_result["text"]
            
            # Parse score and explanation
            score = 0
            comment = eval_text
            
            match = re.search(r"SCORE:\s*(\d+)", eval_text)
            if match:
                score = int(match.group(1))
            
            explanation_match = re.search(r"EXPLANATION:\s*(.*)", eval_text, re.DOTALL)
            if explanation_match:
                comment = explanation_match.group(1).strip()
            else:
                # Fallback if format isn't perfect, try to strip SCORE line
                comment = re.sub(r"SCORE:\s*\d+\s*", "", eval_text).strip()
            
            # Save to DB
            db_result = models.EvaluationResult(
                contractor_id=contractor_id,
                criteria_prompt=prompt,
                score=score, # Placeholder
                comment=comment,
                evidence="",
                input_tokens=eval_result["input_tokens"],
                output_tokens=eval_result["output_tokens"]
            )
            db.add(db_result)
            results.append({"prompt": prompt, "result": eval_text})
        except Exception as e:
            results.append({"prompt": prompt, "error": str(e)})

    db.commit()
    return {"status": "Đánh giá hoàn tất", "results": results}

@app.get("/reports/stats")
def get_stats(db: Session = Depends(get_db)):
    total_packages = db.query(models.BidPackage).count()
    total_contractors = db.query(models.Contractor).count()
    total_evaluations = db.query(models.EvaluationResult).count()
    
    # File stats
    files = db.query(models.ContractorFile).all()
    total_files = len(files)
    total_size_bytes = sum(f.file_size for f in files if f.file_size)
    total_size_mb = total_size_bytes / (1024 * 1024)
    
    # Token stats
    evals = db.query(models.EvaluationResult).all()
    total_input_tokens = sum(e.input_tokens for e in evals if e.input_tokens)
    total_output_tokens = sum(e.output_tokens for e in evals if e.output_tokens)
    
    # Cost estimation (Gemini 1.5 Flash rates)
    # Input: $0.075 / 1M tokens (for < 128k context, assuming short context for now)
    # Output: $0.30 / 1M tokens
    # Storage: Free up to 2GB? Actually File Search has costs.
    # Let's use generic rates:
    # Input: $0.075 per 1M
    # Output: $0.30 per 1M
    # Storage: $0.10 per GB/month (approx)
    
    cost_input = (total_input_tokens / 1_000_000) * 0.075
    cost_output = (total_output_tokens / 1_000_000) * 0.30
    cost_storage = (total_size_mb / 1024) * 0.10 # Very rough estimate per month
    
    total_cost = cost_input + cost_output + cost_storage
    
    return {
        "total_packages": total_packages,
        "total_contractors": total_contractors,
        "total_evaluations": total_evaluations,
        "total_files": total_files,
        "total_storage_mb": round(total_size_mb, 2),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "estimated_cost_usd": round(total_cost, 4)
    }

@app.get("/contractors/{contractor_id}/files")
def list_contractor_files(contractor_id: int, db: Session = Depends(get_db)):
    return db.query(models.ContractorFile).filter(models.ContractorFile.contractor_id == contractor_id).all()

@app.get("/evaluations/{contractor_id}")
def get_evaluations(contractor_id: int, db: Session = Depends(get_db)):
    return db.query(models.EvaluationResult).filter(models.EvaluationResult.contractor_id == contractor_id).all()

@app.delete("/evaluations/{evaluation_id}")
def delete_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    db_eval = db.query(models.EvaluationResult).filter(models.EvaluationResult.id == evaluation_id).first()
    if not db_eval:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả đánh giá")
    db.delete(db_eval)
    db.commit()
    return {"status": "success", "message": "Đã xóa kết quả đánh giá"}

@app.get("/")
def read_root():
    return {"message": "API Backend Hệ thống Đấu thầu AI"}
