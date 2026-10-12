import logging
import asyncio
from librouteros import connect
from librouteros.exceptions import TrapError, ConnectionClosed
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class RouterOSService:
    """
    Live RouterOS integration using librouteros.
    All synchronous API calls are executed in a separate thread using asyncio.to_thread.
    """
    def __init__(self, host, port, user, password):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        logger.info(f"Initialized RouterOS Service for {host}:{port}")

    def _get_api(self):
        """Synchronous method to get an API connection. Must be closed after use."""
        # Using port=8728 (plaintext). Use port=8729 for SSL if supported.
        return connect(
            username=self.user,
            password=self.password,
            host=self.host,
            port=self.port,
            timeout=2.0
        )

    def _sync_provision_hotspot_user(self, pin: str, limit_bytes: Optional[int], limit_uptime: Optional[int], profile: str) -> bool:
        """Synchronous worker to provision or update a hotspot user."""
        try:
            api = self._get_api()
        except Exception as e:
            logger.error(f"Failed to connect to MikroTik router: {e}")
            raise Exception("Router connection failed.")
            
        try:
            hotspot_users = api.path("ip", "hotspot", "user")
            
            # Check if user already exists
            existing = list(hotspot_users.select('name', '.id').where(name=pin))
            
            user_data = {
                "name": pin,
                "password": pin, # Using PIN as password for CHAP
                "profile": profile,
            }
            
            if limit_bytes is not None:
                user_data["limit-bytes-total"] = str(limit_bytes)
            if limit_uptime is not None:
                # MikroTik uptime limit is expected as time format (e.g., "1d", "01:00:00") or just seconds?
                # Actually, RouterOS API usually expects a time string like "1d00:00:00" or just seconds.
                # In modern RouterOS, seconds as a string might work, but it's safer to use standard time notation.
                # However, sending seconds as integer string often works.
                # Let's use seconds string, if it fails, we will need to parse to RouterOS time format.
                # For safety, let's construct HH:MM:SS
                m, s = divmod(limit_uptime, 60)
                h, m = divmod(m, 60)
                d, h = divmod(h, 24)
                time_str = f"{d}d{h:02d}:{m:02d}:{s:02d}" if d > 0 else f"{h:02d}:{m:02d}:{s:02d}"
                user_data["limit-uptime"] = time_str

            if existing:
                # Update existing
                user_id = existing[0]['.id']
                user_data[".id"] = user_id
                hotspot_users.update(**user_data)
                logger.info(f"Updated hotspot user {pin} on router.")
            else:
                # Create new
                hotspot_users.add(**user_data)
                logger.info(f"Created hotspot user {pin} on router.")
                
            return True
        except TrapError as e:
            logger.error(f"RouterOS TrapError provisioning {pin}: {e}")
            raise Exception(f"Router provision error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error provisioning {pin}: {e}")
            raise
        finally:
            api.close()

    async def provision_hotspot_user(self, pin: str, limit_bytes: int = None, limit_uptime: int = None, profile: str = "default") -> bool:
        """Asynchronously provision a user on MikroTik"""
        # Run the blocking synchronous code in a thread pool
        return await asyncio.to_thread(
            self._sync_provision_hotspot_user,
            pin, limit_bytes, limit_uptime, profile
        )

    def _sync_check_user_exists(self, pin: str) -> bool:
        try:
            api = self._get_api()
            try:
                hotspot_users = api.path("ip", "hotspot", "user")
                existing = list(hotspot_users.select('name').where(name=pin))
                return len(existing) > 0
            finally:
                api.close()
        except Exception:
            return False

    async def check_user_exists(self, pin: str) -> bool:
        """Asynchronously check if user exists on MikroTik"""
        return await asyncio.to_thread(self._sync_check_user_exists, pin)

    def _sync_get_active_sessions(self):
        try:
            api = self._get_api()
            try:
                active = api.path("ip", "hotspot", "active")
                return list(active)
            finally:
                api.close()
        except Exception as e:
            logger.error(f"Failed to get active sessions: {e}")
            return []

    async def get_active_sessions(self):
        return await asyncio.to_thread(self._sync_get_active_sessions)

    def _sync_get_user_stats(self):
        try:
            api = self._get_api()
            try:
                users = api.path("ip", "hotspot", "user")
                return list(users)
            finally:
                api.close()
        except Exception as e:
            logger.error(f"Failed to get user stats: {e}")
            return []

    async def get_user_stats(self):
        return await asyncio.to_thread(self._sync_get_user_stats)

    def _sync_disconnect_user(self, pin: str):
        try:
            api = self._get_api()
            try:
                # Remove from active
                active = api.path("ip", "hotspot", "active")
                sessions = list(active.select('.id').where(user=pin))
                for s in sessions:
                    active.remove(s['.id'])
                
                # Disable user
                users = api.path("ip", "hotspot", "user")
                existing = list(users.select('.id').where(name=pin))
                for u in existing:
                    users.update(**{".id": u['.id'], "disabled": "yes"})
            finally:
                api.close()
        except Exception as e:
            logger.error(f"Failed to disconnect user {pin}: {e}")

    def _sync_get_interface_status(self, interface_name: str):
        try:
            api = self._get_api()
            try:
                interfaces = api.path("interface")
                results = list(interfaces.select("running", "disabled").where(name=interface_name))
                if results:
                    return results[0].get("running") == "true" and results[0].get("disabled") == "false"
                return False
            finally:
                api.close()
        except Exception as e:
            logger.error(f"Failed to get interface status: {e}")
            return False

    async def get_interface_status(self, interface_name: str = "ether1"):
        return await asyncio.to_thread(self._sync_get_interface_status, interface_name)

    def _sync_remove_active_session_by_id(self, session_id: str):
        try:
            api = self._get_api()
            try:
                active = api.path("ip", "hotspot", "active")
                active.remove(session_id)
            finally:
                api.close()
        except Exception as e:
            logger.error(f"Failed to remove session {session_id}: {e}")
            raise

    async def remove_active_session_by_id(self, session_id: str):
        return await asyncio.to_thread(self._sync_remove_active_session_by_id, session_id)

    def _sync_remove_user_completely(self, pin: str):
        try:
            api = self._get_api()
            try:
                # Remove from active
                active = api.path("ip", "hotspot", "active")
                sessions = list(active.select('.id').where(user=pin))
                for s in sessions:
                    active.remove(s['.id'])
                
                # Remove from user completely
                users = api.path("ip", "hotspot", "user")
                existing = list(users.select('.id').where(name=pin))
                for u in existing:
                    users.remove(u['.id'])
            finally:
                api.close()
        except Exception as e:
            logger.error(f"Failed to remove user {pin}: {e}")

    async def remove_user_completely(self, pin: str):
        return await asyncio.to_thread(self._sync_remove_user_completely, pin)

    async def disconnect_user(self, pin: str):
        return await asyncio.to_thread(self._sync_disconnect_user, pin)

# Global instance
from app.core.config import settings
router_service = RouterOSService(
    host=settings.MIKROTIK_HOST,
    port=settings.MIKROTIK_PORT,
    user=settings.MIKROTIK_USER,
    password=settings.MIKROTIK_PASSWORD
)
