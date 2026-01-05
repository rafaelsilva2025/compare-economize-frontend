from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json

from openai import OpenAI
from openai import RateLimitError

router = APIRouter(prefix="/ai", tags=["AI"])

class AIRequest(BaseModel):
    prompt: str
    products: list[dict] | None = None  # opcional: [{id,name,categoryId,...}]

@router.post("/identify-products")
def identify_products(payload: AIRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY não configurada no .env do backend")

    client = OpenAI(api_key=api_key)

    user_prompt = payload.prompt.strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="prompt vazio")

    products_text = ""
    if payload.products:
        products_text = "\n".join([f"- {p.get('name')} (id: {p.get('id')})" for p in payload.products])

    prompt = f"""
Você é um assistente que transforma um pedido em lista de itens.

Pedido do usuário:
"{user_prompt}"

Produtos disponíveis (se houver):
{products_text}

Responda APENAS com JSON válido, sem texto extra.
Formato:
{{"items":[{{"productId":"...","quantity":1}}]}}
"""

    try:
        resp = client.responses.create(
            model="gpt-4o-mini",
            input=prompt,
        )

        text = resp.output_text.strip()

        # garante JSON
        try:
            parsed = json.loads(text)
        except Exception:
            # fallback: se o modelo devolveu algo fora do JSON
            parsed = {"items": [], "raw": text}

        return parsed

    except RateLimitError:
        raise HTTPException(status_code=402, detail="IA sem saldo/quota no momento (OpenAI). Coloque créditos e tente novamente.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro IA: {str(e)}")
