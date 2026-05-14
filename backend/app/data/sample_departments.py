from datetime import datetime, timezone

_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)

SAMPLE_DEPARTMENTS = [
    {
        "id": 1,
        "name": "Information Technology",
        "code": "IT",
        "description": "Technology and software development",
        "head": "Jane Smith",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
    {
        "id": 2,
        "name": "Human Resources",
        "code": "HR",
        "description": "People operations and hiring",
        "head": "Alex Chen",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
    {
        "id": 3,
        "name": "Finance",
        "code": "FIN",
        "description": "Financial planning and accounting",
        "head": "Sarah Lee",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
    {
        "id": 4,
        "name": "Marketing",
        "code": "MKT",
        "description": "Brand and customer engagement",
        "head": "Jane Smith",
        "status": "active",
        "createdAt": _NOW,
        "updatedAt": _NOW,
    },
]
