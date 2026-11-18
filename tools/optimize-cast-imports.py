"""Apply bounded GPU texture imports after Godot extracts embedded cast images."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / "native/assets/cast"
count = 0
for path in root.glob("*.import"):
    if path.name.endswith(".glb.import"):
        continue
    text = path.read_text(encoding="utf-8")
    # Allow principal skin maps up to 4K for close-ups. Repeated guards use 1K maps;
    # clothes, hair and accessories use 2K. BC compression avoids runtime WebP
    # decoding and large uncompressed texture allocations on 4GB GPUs.
    size = 1024 if path.name.startswith("guard_") else 4096 if "_skin_" in path.name else 2048
    text = re.sub(r"^compress/mode=\d+$", "compress/mode=2", text, flags=re.M)
    text = re.sub(r"^process/size_limit=\d+$", f"process/size_limit={size}", text, flags=re.M)
    path.write_text(text, encoding="utf-8")
    count += 1
print(f"Configured {count} cast textures for GPU compression")
