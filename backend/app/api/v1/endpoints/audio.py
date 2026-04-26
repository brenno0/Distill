import sounddevice as sd
from fastapi import APIRouter

router = APIRouter(tags=["audio"])


@router.get("/devices")
async def list_audio_devices():
    all_devs = sd.query_devices()
    input_devs = [(i, d) for i, d in enumerate(all_devs) if d.get("max_input_channels", 0) > 0]
    output_devs = [(i, d) for i, d in enumerate(all_devs) if d.get("max_output_channels", 0) > 0]
    return {
        "input": [{"id": i, "name": d["name"]} for i, d in input_devs],
        "output": [{"id": i, "name": d["name"]} for i, d in output_devs],
    }
