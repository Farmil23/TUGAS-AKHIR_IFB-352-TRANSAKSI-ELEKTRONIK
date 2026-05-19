# 1. Import the library
from inference_sdk import InferenceHTTPClient

# 2. Connect to your workflow
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="eIrseFWqzGbrFS6JYPHU"
)

# 3. Run your workflow on an image
result = client.run_workflow(
    workspace_name="agans-workspace",
    workflow_id="money-clustering",
    images={
        "image": "model/template/100k_2.jpg" # Path to your image file
    },
    parameters={
        "confidence": 0.86
    },
    use_cache=True # Speeds up repeated requests
)

# 4. Get your results
print(result)
