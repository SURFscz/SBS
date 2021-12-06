# -*- coding: future_fstrings -*-
white_listing = [
    "/api/images/",
    "/api/invitations/find_by_hash",
    "/api/mfa/jwks",
    "/api/mfa/sfo",
    "/api/mock",
    "/api/organisation_invitations/find_by_hash",
    "/api/users/error",
    "/api/aup/info",
    "/api/service_connection_requests/approve",
    "/api/service_connection_requests/deny",
    "/api/service_connection_requests/find_by_hash",
    "/api/service_invitations/find_by_hash",
    "/api/users/authorization",
    "/api/users/me",
    "/api/users/resume-session",
    "/config",
    "/health",
    "/info"
]

mfa_listing = [
    "/api/mfa/get2fa",
    "/api/mfa/reset2fa",
    "/api/mfa/token_reset_request",
    "/api/mfa/verify2fa"
]

external_api_listing = [
    "/api/invitations/v1/collaboration_invites",
    "/api/collaborations/v1",
    "/api/collaborations/v1/restricted",
    "/api/collaborations_services/v1/connect_collaboration_service"
]
