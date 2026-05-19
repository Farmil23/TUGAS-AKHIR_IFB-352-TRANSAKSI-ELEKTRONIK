import os
import tempfile
from typing import Any, Dict, List

from inference_sdk import InferenceHTTPClient
from inference_sdk.http.errors import HTTPCallErrorError

from app.core.config import settings
from app.services.rupiah_service import rupiah_detector


def _normalize_currency_label(label: str) -> str:
    cleaned = "".join(ch for ch in label if ch.isalnum())
    if not cleaned:
        return label

    lower_cleaned = cleaned.lower()
    digits_only = "".join(ch for ch in lower_cleaned if ch.isdigit())

    if digits_only:
        return digits_only

    if lower_cleaned.startswith("rp"):
        return lower_cleaned.replace("rp", "", 1)

    return label


class CashDetectionService:
    def __init__(self) -> None:
        self.api_key = settings.ROBOFLOW_API_KEY.strip()
        self.api_url = settings.ROBOFLOW_API_URL.strip() or "https://serverless.roboflow.com"
        self.workspace_name = settings.ROBOFLOW_WORKSPACE_NAME.strip()
        self.workflow_id = settings.ROBOFLOW_WORKFLOW_ID.strip()
        self.threshold = settings.ROBOFLOW_CONFIDENCE_THRESHOLD

    def _has_workflow_config(self) -> bool:
        return bool(self.api_key and self.workspace_name and self.workflow_id)

    def _extract_predictions(self, result: Any) -> List[Dict[str, Any]]:
        candidates: List[Dict[str, Any]] = []

        def collect(item: Any) -> None:
            if isinstance(item, dict):
                # Generic Roboflow workflow / detection response shapes.
                if "predictions" in item and isinstance(item["predictions"], list):
                    for prediction in item["predictions"]:
                        collect(prediction)
                    return

                if "detections" in item and isinstance(item["detections"], list):
                    for prediction in item["detections"]:
                        collect(prediction)
                    return

                if "output" in item:
                    collect(item["output"])
                    return

                label = item.get("class") or item.get("label") or item.get("name") or item.get("prediction")
                confidence = item.get("confidence")
                if label is not None:
                    candidates.append(
                        {
                            "class": str(label),
                            "nominal": _normalize_currency_label(str(label)),
                            "confidence": float(confidence or 0),
                            "x": item.get("x"),
                            "y": item.get("y"),
                            "width": item.get("width"),
                            "height": item.get("height"),
                            "raw": item,
                        }
                    )
                    return

                for value in item.values():
                    collect(value)

            elif isinstance(item, list):
                for sub_item in item:
                    collect(sub_item)

        collect(result)
        candidates.sort(key=lambda item: item["confidence"], reverse=True)
        return candidates

    def _run_workflow(self, image_path: str) -> Any:
        client = InferenceHTTPClient(
            api_url=self.api_url,
            api_key=self.api_key,
        )
        return client.run_workflow(
            workspace_name=self.workspace_name,
            workflow_id=self.workflow_id,
            images={"image": image_path},
            parameters={"confidence": self.threshold},
            use_cache=True,
        )

    def detect_from_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        if self._has_workflow_config():
            try:
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
                    tmp_file.write(image_bytes)
                    tmp_file_path = tmp_file.name

                try:
                    payload = self._run_workflow(tmp_file_path)
                finally:
                    if os.path.exists(tmp_file_path):
                        os.remove(tmp_file_path)

                predictions = self._extract_predictions(payload)
                if predictions:
                    best_prediction = predictions[0]

                    if best_prediction["confidence"] < self.threshold:
                        return {
                            "status": "failed",
                            "source": "roboflow",
                            "message": "Prediksi Roboflow belum melewati ambang confidence.",
                            "predictions": predictions,
                            "raw_result": payload,
                        }

                    return {
                        "status": "success",
                        "source": "roboflow",
                        "workflow_id": self.workflow_id,
                        "detected_nominal": best_prediction["nominal"],
                        "confidence": best_prediction["confidence"],
                        "predictions": predictions,
                        "best_prediction": best_prediction,
                        "raw_result": payload,
                    }

                return {
                    "status": "failed",
                    "source": "roboflow",
                    "message": "Roboflow tidak mengembalikan prediksi apa pun.",
                    "predictions": [],
                    "raw_result": payload,
                }

            except HTTPCallErrorError as exc:
                fallback_result = rupiah_detector.detect_rupiah_from_bytes(image_bytes)
                fallback_result["source"] = "opencv-template"
                fallback_result["fallback_reason"] = "Roboflow workflow request failed"
                fallback_result["roboflow_error"] = {
                    "status_code": getattr(exc, "status_code", None),
                    "api_message": getattr(exc, "api_message", None),
                    "description": getattr(exc, "description", str(exc)),
                }
                return fallback_result
            except Exception as exc:
                fallback_result = rupiah_detector.detect_rupiah_from_bytes(image_bytes)
                fallback_result["source"] = "opencv-template"
                fallback_result["fallback_reason"] = f"Roboflow unavailable: {exc}"
                return fallback_result

        fallback_result = rupiah_detector.detect_rupiah_from_bytes(image_bytes)
        fallback_result["source"] = "opencv-template"
        return fallback_result


cash_detector = CashDetectionService()