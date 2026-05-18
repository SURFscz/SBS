from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from server.db.domain import Service

SCIM_QUEUE_PREFIX = "scim:queue:endpoint:"


def normalize_scim_url(scim_url: str) -> str:
    return scim_url.rstrip("/")


def endpoint_queue_key(scim_url: str) -> str:
    return f"{SCIM_QUEUE_PREFIX}{normalize_scim_url(scim_url)}"


def endpoint_from_queue_key(queue_key: str) -> str:
    if queue_key.startswith(SCIM_QUEUE_PREFIX):
        return queue_key[len(SCIM_QUEUE_PREFIX):]
    return queue_key


def group_services_by_endpoint(services: Sequence[Service]) -> Dict[str, List[Service]]:
    grouped: Dict[str, List[Service]] = defaultdict(list)
    seen_service_ids = set()

    for service in services:
        if not service or not getattr(service, "scim_enabled", True):
            continue
        if not getattr(service, "scim_url", None):
            continue
        if service.id in seen_service_ids:
            continue
        seen_service_ids.add(service.id)
        grouped[normalize_scim_url(service.scim_url)].append(service)

    return dict(grouped)


class ScimQueue:
    """Redis-backed FIFO queue for SCIM tasks, keyed by endpoint URL."""
    
    def __init__(self, redis_client):
        self.redis_client = redis_client
        self.logger = logging.getLogger("scim_queue")
    
    def enqueue_by_endpoint(self, endpoint_url: str, payload_json: str) -> bool:
        """Enqueue a SCIM task to the per-endpoint queue.
        
        Args:
            endpoint_url: Normalized SCIM endpoint URL
            payload_json: JSON-serialized payload dict
            
        Returns:
            True if enqueued successfully, False on error
        """
        try:
            key = endpoint_queue_key(endpoint_url)
            self.redis_client.rpush(key, payload_json)
            return True
        except Exception as e:
            self.logger.exception(f"Failed to enqueue task to {endpoint_url}: {str(e)}")
            return False
    
    def dequeue_by_endpoint(self, endpoint_url: str, timeout: int = 0) -> Optional[str]:
        """Dequeue a single SCIM task from the per-endpoint queue (FIFO).
        
        Args:
            endpoint_url: Normalized SCIM endpoint URL
            timeout: Blocking timeout in seconds (0 = non-blocking, >0 = block up to timeout)
            
        Returns:
            JSON string of the dequeued task, or None if queue is empty
        """
        try:
            key = endpoint_queue_key(endpoint_url)
            if timeout <= 0:
                # Non-blocking
                result = self.redis_client.lpop(key)
            else:
                # Blocking with timeout
                result = self.redis_client.blpop(key, timeout)
                if result:
                    # blpop returns (key, value) tuple
                    result = result[1]
            
            if result:
                if isinstance(result, bytes):
                    result = result.decode('utf-8')
                return result
            return None
        except Exception as e:
            self.logger.exception(f"Failed to dequeue task from {endpoint_url}: {str(e)}")
            return None
    
    def dequeue_next_available(self, timeout: int = 1) -> Tuple[Optional[str], Optional[str]]:
        """Dequeue the next available task from any endpoint queue (blocking).
        
        This scans all queues and returns the first available task, blocking briefly
        if no tasks are available. Useful for a pool loop to drain all queues fairly.
        
        Args:
            timeout: Blocking timeout in seconds (default 1)
            
        Returns:
            Tuple of (endpoint_url, payload_json) or (None, None) if no tasks available
        """
        try:
            # Get all queue keys matching our prefix
            pattern = f"{SCIM_QUEUE_PREFIX}*"
            keys = self.redis_client.keys(pattern)
            
            if not keys:
                return None, None
            
            # Try to dequeue from each queue (non-blocking first pass)
            for key in keys:
                result = self.redis_client.lpop(key)
                if result:
                    if isinstance(result, bytes):
                        result = result.decode('utf-8')
                    endpoint_url = endpoint_from_queue_key(key)
                    return endpoint_url, result
            
            # No tasks found in first pass, try blocking on all keys
            if keys and timeout > 0:
                # Use BLPOP on all keys - returns first available
                result = self.redis_client.blpop(keys, timeout)
                if result:
                    key, value = result
                    if isinstance(key, bytes):
                        key = key.decode('utf-8')
                    if isinstance(value, bytes):
                        value = value.decode('utf-8')
                    endpoint_url = endpoint_from_queue_key(key)
                    return endpoint_url, value
            
            return None, None
            
        except Exception as e:
            self.logger.exception(f"Error in dequeue_next_available: {str(e)}")
            return None, None
    
    def get_queue_length(self, endpoint_url: str) -> int:
        """Get the number of pending tasks in a specific endpoint queue.
        
        Args:
            endpoint_url: Normalized SCIM endpoint URL
            
        Returns:
            Number of tasks in the queue
        """
        try:
            key = endpoint_queue_key(endpoint_url)
            return self.redis_client.llen(key)
        except Exception as e:
            self.logger.exception(f"Failed to get queue length for {endpoint_url}: {str(e)}")
            return 0
    
    def get_all_queue_stats(self) -> Dict[str, int]:
        """Get stats for all endpoint queues.
        
        Returns:
            Dict mapping endpoint_url to queue length
        """
        try:
            pattern = f"{SCIM_QUEUE_PREFIX}*"
            keys = self.redis_client.keys(pattern)
            
            stats = {}
            for key in keys:
                endpoint_url = endpoint_from_queue_key(key)
                length = self.redis_client.llen(key)
                if length > 0:
                    stats[endpoint_url] = length
            
            return stats
        except Exception as e:
            self.logger.exception(f"Failed to get queue stats: {str(e)}")
            return {}
