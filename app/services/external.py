def sync_calendar_event(reservation_data):
    """
    Mock integration with Google Calendar.
    In production, use Google Calendar API to insert event.
    """
    print(f"[MOCK] Creating Google Calendar event for reservation: {reservation_data}")
    return True

def log_to_sheets(data):
    """
    Mock integration with Google Sheets.
    """
    print(f"[MOCK] Logging to Google Sheets: {data}")
    return True
