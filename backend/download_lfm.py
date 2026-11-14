"""Download the official PLaMo + LFM GGUF/checkpoints into ./models/.

PLaMo-3-translate-2B W4A16 (used via transformers, ~2.3 GB):
    repo: pfnet/plamo-3-translate-2b-W4A16

LFM3-VL-2B Q4_K_M (used via llama.cpp, ~1.05 GB):
    repo: LiquidAI/LFM3-VL-2B-GGUF
"""
from huggingface_hub import snapshot_download, hf_hub_download

if __name__ == "__main__":
    path = snapshot_download(
        repo_id="pfnet/plamo-3-translate-2b-W4A16",
        local_dir="models/plamo-3-translate-2b-W4A16",
        max_workers=4,
    )
    print("PLaMo W4A16 at:", path)

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
