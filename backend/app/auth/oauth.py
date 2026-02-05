"""
OAuth Providers

Social login integration with Google and GitHub.
"""

from typing import Optional
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request

from app.core.config import settings
from app.auth.schemas import OAuthUserInfo


# Initialize OAuth client
oauth = OAuth()

# Register Google OAuth
if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

# Register GitHub OAuth
if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
    oauth.register(
        name="github",
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=settings.GITHUB_CLIENT_SECRET,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email"},
    )


async def get_google_user_info(token: dict) -> OAuthUserInfo:
    """Extract user info from Google OAuth token."""
    userinfo = token.get("userinfo", {})
    
    return OAuthUserInfo(
        provider="google",
        oauth_id=userinfo.get("sub", ""),
        email=userinfo.get("email", ""),
        full_name=userinfo.get("name"),
        avatar_url=userinfo.get("picture"),
    )


async def get_github_user_info(request: Request, token: dict) -> OAuthUserInfo:
    """Extract user info from GitHub OAuth token."""
    # Get user profile
    client = oauth.github
    resp = await client.get("user", token=token)
    profile = resp.json()
    
    # Get primary email (may be private)
    email = profile.get("email")
    if not email:
        email_resp = await client.get("user/emails", token=token)
        emails = email_resp.json()
        for e in emails:
            if e.get("primary"):
                email = e.get("email")
                break
    
    return OAuthUserInfo(
        provider="github",
        oauth_id=str(profile.get("id", "")),
        email=email or "",
        full_name=profile.get("name"),
        avatar_url=profile.get("avatar_url"),
    )


def is_google_enabled() -> bool:
    """Check if Google OAuth is configured."""
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def is_github_enabled() -> bool:
    """Check if GitHub OAuth is configured."""
    return bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)


def get_enabled_providers() -> list[str]:
    """Get list of enabled OAuth providers."""
    providers = []
    if is_google_enabled():
        providers.append("google")
    if is_github_enabled():
        providers.append("github")
    return providers
