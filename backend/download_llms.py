"""Download MiMo + Qwen GGUFs into ./models/.

PRO tier: XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B (bartowski quants) + vision projector
ULTRA tier: Qwen/Qwen3.6-35B-A3B (unsloth quants, UD-Q3_K_M) + vision projector
"""
from huggingface_hub import hf_hub_download

if __name__ == "__main__":
    p = hf_hub_download(
        repo_id="bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF",
        filename="MiMo-V2.6-Distill-Qwen-9B-Q4_K_M.gguf",
        local_dir="models/MiMo-V2.6-Distill-Qwen-9B",
    )
    print("mimo model:", p, flush=True)

    p = hf_hub_download(
        repo_id="bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF",
        filename="mmproj-MiMo-V2.6-Distill-Qwen-9B-f16.gguf",
        local_dir="models/MiMo-V2.6-Distill-Qwen-9B",
    )
    print("mimo mmproj:", p, flush=True)

    p = hf_hub_download(
        repo_id="unsloth/Qwen3.6-35B-A3B-GGUF",
        filename="Qwen3.6-35B-A3B-UD-Q3_K_M.gguf",
        local_dir="models/Qwen3.6-35B-A3B",
    )
    print("qwen model:", p, flush=True)

    p = hf_hub_download(
        repo_id="unsloth/Qwen3.6-35B-A3B-GGUF",
        filename="mmproj-F16.gguf",
        local_dir="models/Qwen3.6-35B-A3B",
    )
    print("qwen mmproj:", p, flush=True)
