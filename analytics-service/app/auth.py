from fastapi import Header, HTTPException, status
from app.config import settings

async def verify_internal_auth(
    x_internal_key: str = Header(None, alias="X-Internal-Key"),
    authorization: str = Header(None, alias="Authorization")
):
    token = None
    if x_internal_key:
        token = x_internal_key
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token or token != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Unauthorized",
                "message": "Invalid or missing internal service authentication token"
            }
        )
    return True
