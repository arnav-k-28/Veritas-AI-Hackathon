"""Download PLaMo + LFM GGUFs into ./models/.

PLaMo-3-translate-2B Q4_K_M (auto-detected .gguf):
    repo: Eiki-AI/plamo-3-translate-2b-af-q4_k_m

LFM3-VL-2B Q4_K_M + mmproj (used via llama.cpp):
    repo: LiquidAI/LFM3-VL-2B-GGUF
"""
from huggingface_hub import hf_hub_download

from translator_server import PLAMO_REPO_ID, resolve_hf_gguf_filename

if __name__ == "__main__":
    plamo_file = resolve_hf_gguf_filename(PLAMO_REPO_ID)
    path = hf_hub_download(
        repo_id=PLAMO_REPO_ID,
        filename=plamo_file,
        local_dir="models/plamo-3-translate-2b-af-q4_k_m",
    )
    print("PLaMo GGUF at:", path, flush=True)

    path = hf_hub_download(
        repo_id="LiquidAI/LFM3-VL-2B-GGUF",
        filename="LFM3-VL-2B-Q4_K_M.gguf",
        local_dir="models/LFM3-VL-2B-GGUF",
    )
    print("LFM GGUF at:", path, flush=True)

    # Spark vision projector
    path = hf_hub_download(
        repo_id="LiquidAI/LFM3-VL-2B-GGUF",
        filename="mmproj-LFM3-VL-2B-F16.gguf",
        local_dir="models/LFM3-VL-2B-GGUF",
    )
    print("LFM mmproj at:", path, flush=True)
