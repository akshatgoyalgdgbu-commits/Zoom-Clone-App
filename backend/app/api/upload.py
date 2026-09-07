from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.parser_service import parse_roster_file

router = APIRouter(prefix="/upload", tags=["Upload & Parsing"])

@router.post("/roster")
async def upload_roster(file: UploadFile = File(...)):
    """
    Upload and parse an Excel (.xlsx) or CSV (.csv) roster file.
    Validates required columns ('Name', 'Email'), normalizes emails,
    checks for syntax errors, and eliminates duplicates.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload."
        )

    file_ext = file.filename.lower().split(".")[-1]
    if file_ext not in ["xlsx", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .xlsx or .csv spreadsheet."
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is completely empty."
            )
        result = parse_roster_file(contents, file.filename)
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while processing the file: {str(e)}"
        )
