import pytest
from unittest.mock import patch, AsyncMock
from backend.app.model_router.models import ModelProvider, ModelRoute, ProviderResult, ErrorCategory
from backend.app.model_router.allowlist import is_route_allowed, get_allowed_routes
from backend.app.model_router.adapters import execute_provider_route
from backend.app.model_router.router import FreeModelRouter, NoEligibleFreeRouteError


def test_free_allowlist_acceptance():
    """Verify that legitimate free routes are permitted."""
    assert is_route_allowed("groq", "llama-3.3-70b-versatile") is True
    assert is_route_allowed("groq", "llama-3.1-8b-instant") is True
    assert is_route_allowed("gemini", "gemini-1.5-flash") is True
    assert is_route_allowed("gemini", "gemini-2.0-flash-exp") is True
    assert is_route_allowed("openrouter", "meta-llama/llama-3.3-70b-instruct:free") is True
    assert is_route_allowed("openrouter", "google/gemini-2.0-flash-exp:free") is True


def test_paid_routes_strictly_rejected():
    """Verify that unapproved or paid routes are unconditionally rejected."""
    # Paid models must fail
    assert is_route_allowed("openai", "gpt-4o") is False
    assert is_route_allowed("anthropic", "claude-3-5-sonnet") is False
    assert is_route_allowed("groq", "llama-3-paid-enterprise") is False
    
    # OpenRouter route without :free suffix MUST be rejected
    assert is_route_allowed("openrouter", "meta-llama/llama-3.3-70b-instruct") is False
    assert is_route_allowed("openrouter", "anthropic/claude-3.5-sonnet") is False
    assert is_route_allowed("openrouter", "openai/gpt-4o") is False


@pytest.mark.asyncio
async def test_execute_route_blocks_unauthorized_route_preflight():
    """Confirms pre-flight validation blocks disallowed route before making any network call."""
    unauthorized_route = ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="openai/gpt-4-turbo",  # Paid route
        display_name="Paid GPT-4",
        is_free=False,
        description="Paid model",
    )
    result = await execute_provider_route(unauthorized_route, "test prompt", "system prompt")
    assert result.success is False
    assert result.error_category == ErrorCategory.ROUTE_DISALLOWED
    assert "Zero-paid policy violation" in result.error_message


@pytest.mark.asyncio
async def test_router_fallback_on_rate_limit():
    """
    When primary provider hits rate limit (429), router must fallback
    to the next eligible free route without attempting any paid models.
    """
    router = FreeModelRouter(max_route_attempts=3)
    mock_events = []

    def on_event(event_type, msg, details):
        mock_events.append((event_type, msg, details))

    # Mock execute_provider_route to fail first (429 on Groq), succeed second (Gemini)
    async def mock_execute(route: ModelRoute, prompt, sys_prompt, **kwargs):
        if route.provider == ModelProvider.GROQ:
            return ProviderResult(
                success=False,
                provider=ModelProvider.GROQ,
                model_id=route.model_id,
                error_category=ErrorCategory.RATE_LIMIT_OR_QUOTA,
                error_message="Rate limit reached on Groq free tier",
            )
        elif route.provider == ModelProvider.GEMINI:
            return ProviderResult(
                success=True,
                content="Response successfully generated via fallback Gemini free route.",
                provider=ModelProvider.GEMINI,
                model_id=route.model_id,
                latency_ms=120.0,
            )
        return ProviderResult(success=False, provider=route.provider, model_id=route.model_id)

    with patch("backend.app.model_router.router.execute_provider_route", side_effect=mock_execute):
        with patch("backend.app.model_router.router.get_api_key", return_value="mock_key"):
            result = await router.execute_task(
                prompt="Explain zero-cost model routing",
                on_event=on_event,
            )

            assert result.success is True
            assert result.provider == ModelProvider.GEMINI
            assert "fallback Gemini free route" in result.content

            # Verify that fallback retry event was emitted
            retry_events = [e for e in mock_events if e[0] == "task.retry"]
            assert len(retry_events) >= 1
            assert "Falling back to next eligible free route" in retry_events[0][1]


@pytest.mark.asyncio
async def test_router_exhaustion_raises_clear_error():
    """
    When all free routes fail, router raises NoEligibleFreeRouteError
    and strictly refrains from falling back to paid routes.
    """
    router = FreeModelRouter(max_route_attempts=2)

    async def mock_all_fail(route: ModelRoute, prompt, sys_prompt, **kwargs):
        return ProviderResult(
            success=False,
            provider=route.provider,
            model_id=route.model_id,
            error_category=ErrorCategory.RATE_LIMIT_OR_QUOTA,
            error_message="All quota exhausted",
        )

    with patch("backend.app.model_router.router.execute_provider_route", side_effect=mock_all_fail):
        with patch("backend.app.model_router.router.get_api_key", return_value="mock_key"):
            with pytest.raises(NoEligibleFreeRouteError) as exc_info:
                await router.execute_task(prompt="Hello")

            assert "All eligible free routes exhausted" in str(exc_info.value)
            assert "Zero-paid policy prevented any paid model fallback" in str(exc_info.value)
