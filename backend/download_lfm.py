"""Download the official PLaMo + LFM GGUFs into ./models/.

PLaMo-3-translate-2B Q4_K_M (used via llama.cpp):
    repo: pfnet/plamo-3-translate-2b-GGUF

LFM3-VL-2B Q4_K_M + mmproj (used via llama.cpp):
    repo: LiquidAI/LFM3-VL-2B-GGUF
"""
from huggingface_hub import hf_hub_download

if __name__ == "__main__":
    path = hf_hub_download(
        repo_id="pfnet/plamo-3-translate-2b-GGUF",
        filename="plamo-3-translate-2b-Q4_K_M.gguf",
        local_dir="models/plamo-3-translate-2b-GGUF",
    )
    print("PLaMo GGUF at:", path, flush=True)

    path = hf_hub_download(
        repo_id="LiquidAI/LFM3-VL-2B-GGUF",
        filename="LFM3-VL-2B-Q4_K_M.gguf",
        local_dir="models/LFM3-VL-2B-GGUF",
    )
    print("LFM GGUF at:", path)

    # Spark vision is dead without this (server passes --mmproj unconditionally)
    path = hf_hub_download(
        repo_id="LiquidAI/LFM3-VL-2B-GGUF",
        filename="mmproj-LFM3-VL-2B-F16.gguf",
        local_dir="models/LFM3-VL-2B-GGUF",
    )
    print("LFM mmproj at:", path)
