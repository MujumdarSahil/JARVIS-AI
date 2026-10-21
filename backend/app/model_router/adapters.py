import os
import time
import httpx
from typing import Optional, Dict, Any
from backend.app.core.logging import logger
from backend.app.model_router.models import (
    ModelProvider,
    ProviderResult,
    ErrorCategory,
    ModelRoute,
)
from backend.app.model_router.allowlist import is_route_allowed

DEFAULT_TIMEOUT_SEC = 25.0


def get_api_key(provider: ModelProvider) -> Optional[str]:
    """
    Safely retrieves the provider API key from environment variables.
    Supports both OPEN_ROUTER_API_KEY and OPENROUTER_API_KEY aliases.
    Never logs or exposes the key value.
    """
    if provider == ModelProvider.GROQ:
        return os.environ.get("GROQ_API_KEY")
    elif provider == ModelProvider.GEMINI:
        return os.environ.get("GEMINI_API_KEY")
    elif provider == ModelProvider.OPENROUTER:
        return os.environ.get("OPEN_ROUTER_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    return None


async def call_groq(
    route: ModelRoute,
    prompt: str,
    system_prompt: str,
    temperature: float = 0.7,
    timeout: float = DEFAULT_TIMEOUT_SEC,
) -> ProviderResult:
    """Executes a Groq free-tier model call."""
    api_key = get_api_key(ModelProvider.GROQ)
    if not api_key:
        return ProviderResult(
            success=False,
            provider=ModelProvider.GROQ,
            model_id=route.model_id,
            error_category=ErrorCategory.AUTHENTICATION_ERROR,
            error_message="GROQ_API_KEY is not configured in backend environment.",
        )

    start = time.perf_counter()
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": route.model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": route.max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return ProviderResult(
                    success=True,
                    content=content,
                    provider=ModelProvider.GROQ,
                    model_id=route.model_id,
                    latency_ms=latency_ms,
                    raw_metadata={"finish_reason": data["choices"][0].get("finish_reason")},
                )

            # Classify error
            status = resp.status_code
            if status in [401, 403]:
                err_cat = ErrorCategory.AUTHENTICATION_ERROR
                msg = f"Groq authentication rejected (HTTP {status})"
            elif status == 429:
                err_cat = ErrorCategory.RATE_LIMIT_OR_QUOTA
                msg = f"Groq rate limit or free quota exceeded (HTTP 429)"
            elif status >= 500:
                err_cat = ErrorCategory.SERVER_ERROR
                msg = f"Groq upstream server error (HTTP {status})"
            else:
                err_cat = ErrorCategory.INVALID_RESPONSE
                msg = f"Groq request rejected with HTTP {status}: {resp.text[:120]}"

            return ProviderResult(
                success=False,
                provider=ModelProvider.GROQ,
                model_id=route.model_id,
                latency_ms=latency_ms,
                error_category=err_cat,
                error_message=msg,
            )

    except httpx.TimeoutException:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProviderResult(
            success=False,
            provider=ModelProvider.GROQ,
            model_id=route.model_id,
            latency_ms=latency_ms,
            error_category=ErrorCategory.TIMEOUT,
            error_message=f"Groq request timed out after {timeout}s",
        )
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProviderResult(
            success=False,
            provider=ModelProvider.GROQ,
            model_id=route.model_id,
            latency_ms=latency_ms,
            error_category=ErrorCategory.SERVER_ERROR,
            error_message=f"Network error calling Groq: {type(e).__name__}",
        )


async def call_gemini(
    route: ModelRoute,
    prompt: str,
    system_prompt: str,
    temperature: float = 0.7,
    timeout: float = DEFAULT_TIMEOUT_SEC,
) -> ProviderResult:
    """Executes a Gemini Google AI Studio free-tier model call."""
    api_key = get_api_key(ModelProvider.GEMINI)
    if not api_key:
        return ProviderResult(
            success=False,
            provider=ModelProvider.GEMINI,
            model_id=route.model_id,
            error_category=ErrorCategory.AUTHENTICATION_ERROR,
            error_message="GEMINI_API_KEY is not configured in backend environment.",
        )

    start = time.perf_counter()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{route.model_id}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"SYSTEM INSTRUCTION: {system_prompt}\n\nUSER PROMPT: {prompt}"}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": route.max_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            if resp.status_code == 200:
                data = resp.json()
                try:
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return ProviderResult(
                        success=True,
                        content=content,
                        provider=ModelProvider.GEMINI,
                        model_id=route.model_id,
                        latency_ms=latency_ms,
                    )
                except (KeyError, IndexError):
                    return ProviderResult(
                        success=False,
                        provider=ModelProvider.GEMINI,
                        model_id=route.model_id,
                        latency_ms=latency_ms,
                        error_category=ErrorCategory.INVALID_RESPONSE,
                        error_message="Gemini returned malformed candidate payload",
                    )

            status = resp.status_code
            if status in [400, 401, 403]:
                err_cat = ErrorCategory.AUTHENTICATION_ERROR
                msg = f"Gemini key invalid or rejected (HTTP {status})"
            elif status == 429:
                err_cat = ErrorCategory.RATE_LIMIT_OR_QUOTA
                msg = f"Gemini free rate limit or quota exceeded (HTTP 429)"
            elif status >= 500:
                err_cat = ErrorCategory.SERVER_ERROR
                msg = f"Gemini service unavailable (HTTP {status})"
            else:
                err_cat = ErrorCategory.INVALID_RESPONSE
                msg = f"Gemini error response (HTTP {status})"

            return ProviderResult(
                success=False,
                provider=ModelProvider.GEMINI,
                model_id=route.model_id,
                latency_ms=latency_ms,
                error_category=err_cat,
                error_message=msg,
            )

    except httpx.TimeoutException:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProviderResult(
            success=False,
            provider=ModelProvider.GEMINI,
            model_id=route.model_id,
            latency_ms=latency_ms,
            error_category=ErrorCategory.TIMEOUT,
            error_message=f"Gemini request timed out after {timeout}s",
        )
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProviderResult(
            success=False,
            provider=ModelProvider.GEMINI,
            model_id=route.model_id,
            latency_ms=latency_ms,
            error_category=ErrorCategory.SERVER_ERROR,
            error_message=f"Network error calling Gemini: {type(e).__name__}",
        )


async def call_openrouter(
    route: ModelRoute,
    prompt: str,
    system_prompt: str,
    temperature: float = 0.7,
    timeout: float = DEFAULT_TIMEOUT_SEC,
) -> ProviderResult:
    """
    Executes an OpenRouter model call.
    STRICT ZERO-PAID-SPEND RULE:
    The model_id MUST explicitly end in ':free'.
    Any route without ':free' is instantly rejected before dispatch.
    """
    if not route.model_id.endswith(":free"):
        return ProviderResult(
            success=False,
            provider=ModelProvider.OPENROUTER,
            model_id=route.model_id,
            error_category=ErrorCategory.ROUTE_DISALLOWED,
            error_message=f"Paid-spend prevention: OpenRouter model '{route.model_id}' does not have ':free' suffix.",
        )

    api_key = get_api_key(ModelProvider.OPENROUTER)
    if not api_key:
        return ProviderResult(
            success=False,
            provider=ModelProvider.OPENROUTER,
            model_id=route.model_id,
            error_category=ErrorCategory.AUTHENTICATION_ERROR,
            error_message="OPENROUTER_API_KEY is not configured in backend environment.",
        )

    start = time.perf_counter()
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "JARVIS Personal Assistant",
        "Content-Type": "application/json",
    }
    payload = {
        "model": route.model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": route.max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return ProviderResult(
                    success=True,
                    content=content,
                    provider=ModelProvider.OPENROUTER,
                    model_id=route.model_id,
                    latency_ms=latency_ms,
                )

            status = resp.status_code
            if status in [401, 403]:
                err_cat = ErrorCategory.AUTHENTICATION_ERROR
                msg = f"OpenRouter authentication failure (HTTP {status})"
            elif status == 429:
                err_cat = ErrorCategory.RATE_LIMIT_OR_QUOTA
                msg = f"OpenRouter free route quota exhausted (HTTP 429)"
            elif status >= 500:
                err_cat = ErrorCategory.SERVER_ERROR
                msg = f"OpenRouter server error (HTTP {status})"
            else:
                err_cat = ErrorCategory.INVALID_RESPONSE
                msg = f"OpenRouter error (HTTP {status})"

            return ProviderResult(
                success=False,
                provider=ModelProvider.OPENROUTER,
                model_id=route.model_id,
                latency_ms=latency_ms,
                error_category=err_cat,
                error_message=msg,
            )

    except httpx.TimeoutException:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProviderResult(
            success=False,
            provider=ModelProvider.OPENROUTER,
            model_id=route.model_id,
            latency_ms=latency_ms,
            error_category=ErrorCategory.TIMEOUT,
            error_message=f"OpenRouter request timed out after {timeout}s",
        )
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return ProviderResult(
            success=False,
            provider=ModelProvider.OPENROUTER,
            model_id=route.model_id,
            latency_ms=latency_ms,
            error_category=ErrorCategory.SERVER_ERROR,
            error_message=f"Network error calling OpenRouter: {type(e).__name__}",
        )


async def execute_provider_route(
    route: ModelRoute,
    prompt: str,
    system_prompt: str,
    temperature: float = 0.7,
    timeout: float = DEFAULT_TIMEOUT_SEC,
) -> ProviderResult:
    """
    Central dispatcher for model execution with mandatory pre-flight allowlist verification.
    """
    # Pre-flight check: Is this route permitted by the zero-paid-spend policy?
    if not is_route_allowed(route.provider.value, route.model_id):
        logger.error(
            f"BLOCKED BY POLICY: Attempted unapproved route {route.provider.value}/{route.model_id}"
        )
        return ProviderResult(
            success=False,
            provider=route.provider,
            model_id=route.model_id,
            error_category=ErrorCategory.ROUTE_DISALLOWED,
            error_message=f"Zero-paid policy violation: {route.provider.value}/{route.model_id} is not in the approved free-tier allowlist.",
        )

    if route.provider == ModelProvider.GROQ:
        return await call_groq(route, prompt, system_prompt, temperature, timeout)
    elif route.provider == ModelProvider.GEMINI:
        return await call_gemini(route, prompt, system_prompt, temperature, timeout)
    elif route.provider == ModelProvider.OPENROUTER:
        return await call_openrouter(route, prompt, system_prompt, temperature, timeout)
    else:
        return ProviderResult(
            success=False,
            provider=route.provider,
            model_id=route.model_id,
            error_category=ErrorCategory.ROUTE_DISALLOWED,
            error_message=f"Unsupported provider: {route.provider}",
        )
