from pypdf import PdfReader
import io

async def extract_text_from_pdf(file):

    contents = await file.read()

    reader = PdfReader(io.BytesIO(contents))

    text = ""

    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text