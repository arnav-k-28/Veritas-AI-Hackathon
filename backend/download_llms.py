"""Download MiMo GGUF into ./models/.

PRO tier: XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B (bartowski quants) + vision projector
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
