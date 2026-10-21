from typing import List, Optional
from backend.app.model_router.models import ModelProvider, ModelRoute

# ==============================================================================
# STRICT FREE-ONLY ALLOWLIST
# Zero-Paid Spend Policy:
# 1. Only models explicitly registered here may ever be invoked.
# 2. Paid fallback is hardcoded to FALSE.
# 3. OpenRouter routes MUST explicitly have the ':free' suffix.
# 4. Any attempt to route to an unlisted model is rejected before making a network call.
# ==============================================================================

FREE_ROUTE_ALLOWLIST: List[ModelRoute] = [
    # --- GROQ (Free Tier) ---
    ModelRoute(
        provider=ModelProvider.GROQ,
        model_id="openai/gpt-oss-20b",
        display_name="Groq / GPT-OSS 20B",
        max_tokens=4096,
        is_free=True,
        description="High-speed open-source 20B on Groq LPUs under free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GROQ,
        model_id="openai/gpt-oss-120b",
        display_name="Groq / GPT-OSS 120B",
        max_tokens=4096,
        is_free=True,
        description="High-capacity open-source 120B on Groq LPUs under free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GROQ,
        model_id="qwen/qwen3.8-27b",
        display_name="Groq / Qwen 3.8 27B",
        max_tokens=4096,
        is_free=True,
        description="Advanced reasoning Qwen 3.8 27B on Groq LPUs under free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GROQ,
        model_id="llama-3.3-70b-versatile",
        display_name="Groq / Llama 3.3 70B",
        max_tokens=4096,
        is_free=True,
        description="Llama 3.3 70B on Groq LPUs with zero-paid free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GROQ,
        model_id="llama-3.1-8b-instant",
        display_name="Groq / Llama 3.1 8B Instant",
        max_tokens=4096,
        is_free=True,
        description="Ultra-fast Llama 3.1 8B on Groq with low latency.",
    ),

    # --- GEMINI (Google AI Studio Free Tier) ---
    ModelRoute(
        provider=ModelProvider.GEMINI,
        model_id="gemini-3.5-flash",
        display_name="Google / Gemini 3.5 Flash",
        max_tokens=8192,
        is_free=True,
        description="Fast multimodal reasoning under Google AI Studio free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GEMINI,
        model_id="gemini-flash-lite-latest",
        display_name="Google / Gemini Flash Lite",
        max_tokens=8192,
        is_free=True,
        description="Low-latency lightweight Gemini flash under free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GEMINI,
        model_id="gemini-3.5-flash-lite",
        display_name="Google / Gemini 3.5 Flash Lite",
        max_tokens=8192,
        is_free=True,
        description="Efficient Gemini 3.5 Flash Lite under free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.GEMINI,
        model_id="gemini-1.5-flash",
        display_name="Google / Gemini 1.5 Flash",
        max_tokens=8192,
        is_free=True,
        description="Gemini 1.5 Flash route.",
    ),
    ModelRoute(
        provider=ModelProvider.GEMINI,
        model_id="gemini-2.0-flash-exp",
        display_name="Google / Gemini 2.0 Flash Exp",
        max_tokens=8192,
        is_free=True,
        description="Gemini 2.0 experimental free route.",
    ),

    # --- OPENROUTER (Explicit :free routes only) ---
    ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="minimax/minimax-m3.1-flash:free",
        display_name="OpenRouter / MiniMax 3.1 Flash (Free)",
        max_tokens=4096,
        is_free=True,
        description="High speed MiniMax 3.1 Flash on OpenRouter free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="nvidia/nemotron-3.5-lightning:free",
        display_name="OpenRouter / Nemotron 3.5 Lightning (Free)",
        max_tokens=4096,
        is_free=True,
        description="NVIDIA Nemotron 3.5 Lightning on OpenRouter free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="liquid/lfm-2.5-2.6b:free",
        display_name="OpenRouter / Liquid LFM 2.5 (Free)",
        max_tokens=4096,
        is_free=True,
        description="Liquid LFM 2.5 on OpenRouter zero-credit free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="meta-llama/llama-3.3-70b-instruct:free",
        display_name="OpenRouter / Llama 3.3 70B (Free)",
        max_tokens=4096,
        is_free=True,
        description="Meta Llama 3.3 70B Instruct hosted via OpenRouter free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="google/gemini-2.0-flash-exp:free",
        display_name="OpenRouter / Gemini 2.0 Flash (Free)",
        max_tokens=4096,
        is_free=True,
        description="Google Gemini 2.0 Flash hosted via OpenRouter free tier.",
    ),
    ModelRoute(
        provider=ModelProvider.OPENROUTER,
        model_id="mistralai/mistral-7b-instruct:free",
        display_name="OpenRouter / Mistral 7B (Free)",
        max_tokens=4096,
        is_free=True,
        description="Mistral 7B Instruct hosted via OpenRouter free tier.",
    ),
]


def is_route_allowed(provider: str, model_id: str) -> bool:
    """
    Validates whether a provider and model combination is strictly approved
    under the application's zero-paid-spend policy.
    """
    provider_str = provider.lower().strip()
    model_str = model_id.strip()

    # Special check for OpenRouter: MUST contain :free
    if provider_str == ModelProvider.OPENROUTER.value:
        if not model_str.endswith(":free"):
            return False

    for route in FREE_ROUTE_ALLOWLIST:
        if route.provider.value == provider_str and route.model_id == model_str:
            return route.is_free

    return False


def get_allowed_routes(provider: Optional[ModelProvider] = None) -> List[ModelRoute]:
    """Returns the list of eligible free routes, optionally filtered by provider."""
    if provider is None:
        return list(FREE_ROUTE_ALLOWLIST)
    return [r for r in FREE_ROUTE_ALLOWLIST if r.provider == provider]
