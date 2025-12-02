from google import genai
import inspect

try:
    client = genai.Client(api_key="TEST")
    print("Signature:", inspect.signature(client.files.upload))
    print("Doc:", client.files.upload.__doc__)
except Exception as e:
    print(e)
