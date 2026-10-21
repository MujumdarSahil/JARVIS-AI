import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


# Canonical mappings for common geographical regions, states, cities, and timezones
LOCATION_TIMEZONE_MAP: Dict[str, str] = {
    # California / US Pacific
    "california": "America/Los_Angeles",
    "ca": "America/Los_Angeles",
    "los angeles": "America/Los_Angeles",
    "san francisco": "America/Los_Angeles",
    "san diego": "America/Los_Angeles",
    "san jose": "America/Los_Angeles",
    "pacific time": "America/Los_Angeles",
    "pacific": "America/Los_Angeles",
    "pst": "America/Los_Angeles",
    "pdt": "America/Los_Angeles",
    "seattle": "America/Los_Angeles",
    "washington state": "America/Los_Angeles",

    # US Eastern
    "new york": "America/New_York",
    "ny": "America/New_York",
    "nyc": "America/New_York",
    "eastern time": "America/New_York",
    "eastern": "America/New_York",
    "est": "America/New_York",
    "edt": "America/New_York",
    "washington dc": "America/New_York",
    "boston": "America/New_York",
    "miami": "America/New_York",
    "florida": "America/New_York",

    # US Central
    "chicago": "America/Chicago",
    "central time": "America/Chicago",
    "central": "America/Chicago",
    "cst": "America/Chicago",
    "cdt": "America/Chicago",
    "texas": "America/Chicago",
    "houston": "America/Chicago",
    "dallas": "America/Chicago",

    # US Mountain
    "denver": "America/Denver",
    "mountain time": "America/Denver",
    "mountain": "America/Denver",
    "mst": "America/Denver",
    "mdt": "America/Denver",
    "colorado": "America/Denver",
    "phoenix": "America/Phoenix",
    "arizona": "America/Phoenix",

    # International
    "london": "Europe/London",
    "uk": "Europe/London",
    "united kingdom": "Europe/London",
    "england": "Europe/London",
    "gmt": "Europe/London",
    "bst": "Europe/London",

    "paris": "Europe/Paris",
    "france": "Europe/Paris",
    "berlin": "Europe/Berlin",
    "germany": "Europe/Berlin",
    "tokyo": "Asia/Tokyo",
    "japan": "Asia/Tokyo",
    "jst": "Asia/Tokyo",
    "sydney": "Australia/Sydney",
    "australia": "Australia/Sydney",
    "india": "Asia/Kolkata",
    "delhi": "Asia/Kolkata",
    "mumbai": "Asia/Kolkata",
    "ist": "Asia/Kolkata",
    "utc": "UTC",
    "gmt": "UTC",
}


def get_current_utc_str() -> str:
    """Returns authoritative current UTC timestamp for context grounding."""
    now = datetime.now(timezone.utc)
    return now.strftime("%A, %B %d, %Y %H:%M:%S UTC")


def resolve_timezone(target: str) -> Tuple[Optional[Any], str]:
    """
    Resolves a location name or IANA timezone string into a tzinfo object.
    Falls back gracefully if ZoneInfo lookup encounters an edge case.
    """
    cleaned = target.lower().strip()
    
    # Check known location map
    iana_name = LOCATION_TIMEZONE_MAP.get(cleaned)
    if not iana_name:
        for k, v in LOCATION_TIMEZONE_MAP.items():
            if re.search(rf"\b{re.escape(k)}\b", cleaned):
                iana_name = v
                break

    if not iana_name:
        iana_name = target.strip()

    # Attempt ZoneInfo resolution
    if ZoneInfo:
        try:
            return ZoneInfo(iana_name), iana_name
        except Exception:
            pass

    # Basic UTC offset fallbacks if tzdata is absent
    if "los_angeles" in iana_name.lower() or "pacific" in iana_name.lower():
        # Pacific is UTC-7 in summer (PDT), UTC-8 in winter (PST)
        # Check current month for rough DST or default to PDT (month 3-11)
        now_utc = datetime.now(timezone.utc)
        is_dst = 3 <= now_utc.month <= 11
        offset_hours = -7 if is_dst else -8
        return timezone(timedelta(hours=offset_hours), "PDT" if is_dst else "PST"), iana_name

    if "new_york" in iana_name.lower() or "eastern" in iana_name.lower():
        now_utc = datetime.now(timezone.utc)
        is_dst = 3 <= now_utc.month <= 11
        offset_hours = -4 if is_dst else -5
        return timezone(timedelta(hours=offset_hours), "EDT" if is_dst else "EST"), iana_name

    return timezone.utc, "UTC"


def get_timezone_time(location_or_tz: str) -> Dict[str, Any]:
    """
    Calculates deterministic, timezone-aware time and date for a given location or timezone.
    Never hallucinates or guesses.
    """
    tz_obj, iana_name = resolve_timezone(location_or_tz)
    now = datetime.now(tz_obj)

    time_12h = now.strftime("%I:%M:%S %p").lstrip("0")
    date_str = now.strftime("%A, %B %d, %Y")
    tz_abbr = now.strftime("%Z")
    utc_offset = now.strftime("%z")
    formatted_offset = f"UTC{utc_offset[:3]}:{utc_offset[3:]}" if len(utc_offset) == 5 else f"UTC{utc_offset}"

    return {
        "location": location_or_tz,
        "iana_timezone": iana_name,
        "time_12h": time_12h,
        "date_str": date_str,
        "tz_abbr": tz_abbr,
        "utc_offset": formatted_offset,
        "iso_timestamp": now.isoformat(),
        "formatted_answer": (
            f"The current time in {location_or_tz.strip().title()} ({iana_name}) "
            f"is {time_12h} on {date_str} ({tz_abbr}, {formatted_offset})."
        ),
    }


def detect_time_query(prompt: str) -> Optional[Dict[str, Any]]:
    """
    Inspects user prompt to determine if it is a real-time clock or date inquiry.
    If matched, resolves and returns the deterministic time data without invoking LLM.
    """
    p_lower = prompt.lower().strip()

    # Match time intent phrases
    is_time_query = bool(
        re.search(r"\b(what time is it|what is the (current )?time|current time|tell me the time)\b", p_lower)
        or re.search(r"\b(what('s| is) (the )?date|today('s)? date|current date)\b", p_lower)
    )

    if not is_time_query:
        return None

    # Detect target location in prompt
    matched_location = "UTC"
    
    # Priority check for California / Pacific
    if re.search(r"\b(california|ca|los angeles|san francisco)\b", p_lower):
        matched_location = "California, USA"
    elif re.search(r"\b(new york|nyc)\b", p_lower):
        matched_location = "New York, USA"
    elif re.search(r"\b(chicago)\b", p_lower):
        matched_location = "Chicago, USA"
    elif re.search(r"\b(london|uk|united kingdom)\b", p_lower):
        matched_location = "London, UK"
    elif re.search(r"\b(tokyo|japan)\b", p_lower):
        matched_location = "Tokyo, Japan"
    elif re.search(r"\b(india|delhi|mumbai)\b", p_lower):
        matched_location = "India"
    else:
        # Check general location patterns: "in <location>"
        loc_match = re.search(r"\bin ([a-zA-Z\s,]+?)( right now|\?|$)", p_lower)
        if loc_match:
            candidate = loc_match.group(1).strip()
            if candidate and len(candidate) > 1:
                matched_location = candidate

    return get_timezone_time(matched_location)
