"""
Dispatcher for SCIM queue payloads.

Routes enqueued SCIM change events from Redis queues to the appropriate apply_* function,
extracting service_ids from the payload to constrain processing to specific services.
"""

import json
import logging
from typing import Optional, Dict, Any

from server.scim.scim import (
    apply_collaboration_change,
    apply_group_change,
    apply_organisation_change,
    apply_service_changed,
    apply_user_change,
    apply_user_deletion,
)


def dispatch_scim_task(app, payload_json: str) -> Optional[str]:
    """
    Dispatch a SCIM task from the queue to the appropriate apply_* function.
    
    Args:
        app: Flask application instance (used as context for apply_* functions)
        payload_json: JSON string containing the task payload with action and service_ids
        
    Returns:
        Error message if dispatch failed, None if successful
        
    Expected payload structure:
        {
            "action": "user_changed|user_deleted|collaboration_changed|...",
            "service_ids": [1, 2, 3],
            "timestamp": "2026-05-11T12:34:56.789Z",
            ... action-specific fields ...
        }
    """
    logger = logging.getLogger("scim")
    
    try:
        payload: Dict[str, Any] = json.loads(payload_json)
    except (json.JSONDecodeError, TypeError) as e:
        error_msg = f"Failed to parse SCIM task payload: {str(e)}"
        logger.error(error_msg)
        return error_msg
    
    try:
        action = payload.get("action")
        service_ids = payload.get("service_ids") or []
        
        if action == "user_changed":
            apply_user_change(
                app,
                payload["user_id"],
                service_ids=service_ids if service_ids else None
            )
        elif action == "user_deleted":
            apply_user_deletion(
                app,
                payload.get("external_id"),
                payload.get("collaboration_ids", []),
                service_ids=service_ids if service_ids else None
            )
        elif action in ("collaboration_changed", "collaboration_deleted"):
            apply_collaboration_change(
                app,
                payload.get("collaboration_id"),
                bool(payload.get("deletion", False)),
                service_ids=service_ids if service_ids else None
            )
        elif action in ("group_changed", "group_deleted"):
            apply_group_change(
                app,
                payload.get("group_id"),
                bool(payload.get("deletion", False)),
                service_ids=service_ids if service_ids else None
            )
        elif action == "service_changed":
            apply_service_changed(
                app,
                payload.get("collaboration_id"),
                payload.get("service_id"),
                bool(payload.get("deletion", False)),
                service_ids=service_ids if service_ids else None
            )
        elif action == "organisation_deleted":
            apply_organisation_change(
                app,
                payload.get("organisation_id"),
                bool(payload.get("deletion", False)),
                service_ids=service_ids if service_ids else None
            )
        else:
            error_msg = f"Unknown SCIM action: {action}"
            logger.warning(error_msg)
            return error_msg
            
        return None  # Success
        
    except Exception as e:
        error_msg = f"Error dispatching SCIM task (action={action}): {str(e)}"
        logger.exception(error_msg)
        return error_msg
