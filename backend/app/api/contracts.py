from fastapi import APIRouter, UploadFile, File
from app.services.extractor import extract_text_from_pdf
from engine.analyzer import analyze_contract as analyze_contract_engine

router = APIRouter(prefix="/contracts")


@router.post('/analyze')
async def handle_contract_analysis(file: UploadFile = File(...)):

    text = await extract_text_from_pdf(file)

    result = analyze_contract_engine(text)

    return result