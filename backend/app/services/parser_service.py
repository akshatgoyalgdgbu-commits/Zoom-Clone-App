import io
import csv
import re
from typing import List, Dict, Any, Tuple
import openpyxl

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def normalize_header(header: str) -> str:
    """Normalize a header string for flexible column matching."""
    return re.sub(r"[_\s\-]+", "", str(header).strip().lower())

def find_column_indices(headers: List[str]) -> Tuple[int, int, int]:
    """
    Find indices for name, email, and optional phone columns.
    Returns: (name_idx, email_idx, phone_idx) where phone_idx can be -1 if missing.
    """
    name_idx = -1
    email_idx = -1
    phone_idx = -1

    for idx, raw_h in enumerate(headers):
        norm = normalize_header(raw_h)
        if norm in ["name", "fullname", "attendeename", "displayname", "participantname", "firstandlastname"]:
            name_idx = idx
        elif norm in ["email", "emailaddress", "emailid", "e-mail", "mail"]:
            email_idx = idx
        elif norm in ["phone", "phonenumber", "mobile", "mobilenumber", "cell", "telephone", "tel"]:
            phone_idx = idx

    if name_idx == -1:
        raise ValueError("Missing required 'Name' column in uploaded file. Please ensure a 'Name' header is present.")
    if email_idx == -1:
        raise ValueError("Missing required 'Email' column in uploaded file. Please ensure an 'Email' header is present.")

    return name_idx, email_idx, phone_idx

def parse_roster_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parse an uploaded .xlsx or .csv roster file.
    Validates headers, email syntax, strips empty rows, and handles duplicate emails.
    Returns:
      {
        "participants": List[Dict[str, str]],
        "total_parsed": int,
        "duplicates_skipped": int,
        "filename": str
      }
    """
    filename_lower = filename.lower()
    raw_rows: List[List[str]] = []

    if filename_lower.endswith(".xlsx"):
        try:
            workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = workbook.active
            if not sheet:
                raise ValueError("The uploaded Excel workbook contains no active worksheets.")
            for row in sheet.iter_rows(values_only=True):
                if any(row):  # skip completely empty lines
                    raw_rows.append([str(cell or "").strip() for cell in row])
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            raise ValueError(f"Unable to parse Excel file: {str(e)}")

    elif filename_lower.endswith(".csv"):
        # Try different encodings
        decoded_text = ""
        for encoding in ["utf-8-sig", "utf-8", "latin-1"]:
            try:
                decoded_text = file_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        if not decoded_text:
            raise ValueError("Unable to decode CSV file with standard UTF-8/Latin-1 encodings.")

        reader = csv.reader(io.StringIO(decoded_text))
        for row in reader:
            if any(cell.strip() for cell in row):
                raw_rows.append([cell.strip() for cell in row])
    else:
        raise ValueError("Unsupported file format. Please upload a .xlsx or .csv file.")

    if not raw_rows:
        raise ValueError("The uploaded file is empty.")

    headers = raw_rows[0]
    name_idx, email_idx, phone_idx = find_column_indices(headers)

    seen_emails = set()
    participants: List[Dict[str, str]] = []
    duplicates_skipped = 0

    for row_idx, row in enumerate(raw_rows[1:], start=2):
        if not row or all(c == "" for c in row):
            continue

        name = row[name_idx].strip() if name_idx < len(row) else ""
        raw_email = row[email_idx].strip() if email_idx < len(row) else ""
        phone = row[phone_idx].strip() if (phone_idx != -1 and phone_idx < len(row)) else None

        if not name or not raw_email:
            # Skip incomplete entries or header artifacts
            continue

        email = raw_email.lower()
        if not EMAIL_REGEX.match(email):
            raise ValueError(f"Invalid email format '{raw_email}' at row {row_idx}.")

        if email in seen_emails:
            duplicates_skipped += 1
            continue

        seen_emails.add(email)
        participants.append({
            "name": name,
            "email": email,
            "phone": phone if phone else None
        })

    if not participants:
        raise ValueError("No valid attendee records could be extracted from the file.")

    return {
        "participants": participants,
        "total_parsed": len(participants),
        "duplicates_skipped": duplicates_skipped,
        "filename": filename
    }
