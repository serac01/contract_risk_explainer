from fastapi import APIRouter, UploadFile, File
from app.services.extractor import extract_text_from_pdf
from app.services.analyzer import analyze_contract

router = APIRouter(prefix="/contracts")

@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):

    text = await extract_text_from_pdf(file)

    result = analyze_contract(text)

    return result