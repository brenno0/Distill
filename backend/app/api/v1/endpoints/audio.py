import re
import subprocess
import sounddevice as sd
from fastapi import APIRouter

router = APIRouter(tags=["audio"])


def _list_monitor_sources() -> list[dict]:
    try:
        result = subprocess.run(
            ["pactl", "list", "sources", "short"],
            capture_output=True, text=True, timeout=2,
        )
        monitors = []
        for line in result.stdout.splitlines():
            parts = line.split("\t")
            if len(parts) >= 2 and ".monitor" in parts[1]:
                name = parts[1]
                human = re.sub(
                    r"alsa_output\.|\.monitor|usb-.*?-\d+\.|pci-[\w.]+\.",
                    "",
                    name,
                ).replace("-", " ").replace("_", " ").strip().title()
                monitors.append({"id": name, "name": f"{human} (Monitor)"})
        return monitors
    except Exception:
        return []


@router.get("/devices")
async def list_audio_devices():
    all_devs = sd.query_devices()
    input_devs = [(i, d) for i, d in enumerate(all_devs) if d.get("max_input_channels", 0) > 0]
    output_devs = [(i, d) for i, d in enumerate(all_devs) if d.get("max_output_channels", 0) > 0]
    return {
        "input": [{"id": i, "name": d["name"]} for i, d in input_devs],
        "output": [{"id": i, "name": d["name"]} for i, d in output_devs],
        "monitors": _list_monitor_sources(),
    }
