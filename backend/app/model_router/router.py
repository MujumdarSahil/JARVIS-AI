import asyncio
from typing import List, Optional, Callable, Any
from backend.app.core.logging import logger
from backend.app.model_router.models import (
    ModelProvider,
    ModelRoute,
    ProviderResult,
    ErrorCategory,
)
from backend.app.model_router.allowlist import FREE_ROUTE_ALLOWLIST, is_route_allowed
from backend.app.model_router.adapters import execute_provider_route, get_api_key


class NoEligibleFreeRouteError(Exception):
    """Raised when all configured free routes are exhausted or unavailable."""
    pass


class FreeModelRouter:
    """
    Centralized router ensuring zero paid spend.
    Selects eligible free routes, attempts execution with bounded retries,
    and falls back across providers upon failures (rate limits, timeouts, service errors).
    """

    def __init__(self, max_route_attempts: int = 3):
        self.max_route_attempts = max_route_attempts

    def get_available_routes(self, preferred_provider: Optional[ModelProvider] = None) -> List[ModelRoute]:
        """
        Returns all allowable free routes that have corresponding API keys in the environment.
        Orders by preferred provider if specified.
        """
        routes: List[ModelRoute] = []

        # Default priority order: Groq (ultra fast) -> Gemini -> OpenRouter
        priority = [ModelProvider.GROQ, ModelProvider.GEMINI, ModelProvider.OPENROUTER]
        if preferred_provider and preferred_provider in priority:
            priority.remove(preferred_provider)
            priority.insert(0, preferred_provider)

        for provider in priority:
            # Check if key is available in environment
            if not get_api_key(provider):
                continue

            provider_routes = [r for r in FREE_ROUTE_ALLOWLIST if r.provider == provider]
            routes.extend(provider_routes)

        return routes

    async def execute_task(
        self,
        prompt: str,
        system_prompt: str = "You are JARVIS, a helpful, precise personal AI assistant. Formulate your answer concisely and accurately.",
        preferred_provider: Optional[ModelProvider] = None,
        on_event: Optional[Callable[[str, str, dict], Any]] = None,
    ) -> ProviderResult:
        """
        Executes a prompt through eligible free routes with controlled fallback.
        Calls `on_event(event_type, message, details)` to report real backend progress.
        """
        eligible_routes = self.get_available_routes(preferred_provider)

        if not eligible_routes:
            msg = "Zero-paid policy: No eligible free routes are available. Please configure GROQ_API_KEY, GEMINI_API_KEY, or OPEN_ROUTER_API_KEY in the environment."
            if on_event:
                await self._emit(on_event, "task.failed", msg, {"reason": "no_keys_configured"})
            raise NoEligibleFreeRouteError(msg)

        attempt_count = 0
        last_error = "Unknown error"
        failed_providers = set()

        for route in eligible_routes:
            if route.provider in failed_providers:
                continue

            if attempt_count >= self.max_route_attempts:
                logger.warning(f"Reached maximum fallback attempt limit ({self.max_route_attempts})")
                break

            attempt_count += 1
            logger.info(
                f"[Router] Attempt {attempt_count}: Selecting free route {route.provider.value}/{route.model_id}"
            )

            if on_event:
                await self._emit(
                    on_event,
                    "task.model_selected",
                    f"Selected free route: {route.display_name}",
                    {"provider": route.provider.value, "model_id": route.model_id, "attempt": attempt_count},
                )

            # Execute provider call
            result = await execute_provider_route(route, prompt, system_prompt)

            if result.success and result.content:
                logger.info(
                    f"[Router] Success with {route.provider.value}/{route.model_id} in {result.latency_ms}ms"
                )
                if on_event:
                    await self._emit(
                        on_event,
                        "task.progress",
                        f"Response generated via {route.display_name} in {result.latency_ms}ms",
                        {"provider": route.provider.value, "model_id": route.model_id, "latency_ms": result.latency_ms},
                    )
                return result

            # Failure occurred — classify and decide fallback
            last_error = result.error_message or "Execution failed"
            logger.warning(
                f"[Router] Route {route.provider.value}/{route.model_id} failed: [{result.error_category}] {last_error}"
            )

            # Emit fallback notice
            if on_event:
                await self._emit(
                    on_event,
                    "task.retry",
                    f"Route {route.display_name} failed ({result.error_category}). Falling back to next eligible free route...",
                    {
                        "failed_provider": route.provider.value,
                        "failed_model": route.model_id,
                        "category": str(result.error_category),
                        "error": last_error,
                    },
                )

            # If authentication or rate-limit/quota error, skip further attempts on this provider
            if result.error_category in [ErrorCategory.AUTHENTICATION_ERROR, ErrorCategory.RATE_LIMIT_OR_QUOTA]:
                logger.warning(f"Skipping further attempts on {route.provider.value} due to {result.error_category}.")
                failed_providers.add(route.provider)

            # Small pause before trying next provider
            await asyncio.sleep(0.1)

        # If all routes exhausted
        exhausted_msg = f"All eligible free routes exhausted ({attempt_count} attempted). Last error: {last_error}. Zero-paid policy prevented any paid model fallback."
        if on_event:
            await self._emit(
                on_event,
                "task.failed",
                exhausted_msg,
                {"attempts": attempt_count, "last_error": last_error},
            )

        raise NoEligibleFreeRouteError(exhausted_msg)

    async def _emit(self, callback: Callable, event_type: str, message: str, details: dict):
        try:
            res = callback(event_type, message, details)
            if hasattr(res, "__await__"):
                await res
        except Exception as e:
            logger.warning(f"Failed to deliver router progress callback: {e}")


# Singleton instance
model_router = FreeModelRouter(max_route_attempts=3)
