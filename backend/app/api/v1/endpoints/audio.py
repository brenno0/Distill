import sounddevice as sd
from fastapi import APIRouter

router = APIRouter(tags=["audio"])


@router.get("/devices")
async def list_audio_devices():
    all_devs = sd.query_devices()
    input_devs = [d for i, d in enumerate(all_devs) if d.get("max_input_channels", 0) > 0]
    output_devs = [d for i, d in enumerate(all_devs) if d.get("max_output_channels", 0) > 0]
    return {
        "input": [{"id": idx, "name": d["name"]} for idx, d in enumerate(input_devs)],
        "output": [{"id": idx, "name": d["name"]} for idx, d in enumerate(output_devs)],
    }
