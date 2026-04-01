import asyncio
from httpx import AsyncClient

async def main():
    async with AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # 1. Create session (upload data)
        with open("test.csv", "w") as f:
            f.write("A,B\n1.0,M\n2.0,F\n3.0,M\n4.0,F\n5.0,M\n")
        
        with open("test.csv", "rb") as f:
            res = await client.post("/api/data/upload", files={"file": ("test.csv", f, "text/csv")})
            print("UPLOAD", res.status_code)
            session_id = res.json()["session_id"]
            
        # 2. Compute descriptive (no filter)
        res = await client.post("/api/descriptive/compute", json={
            "session_id": session_id,
            "column": "A",
            "quantileProbs": [0.25, 0.5, 0.75],
            "trimAlpha": None,
            "winsorLimits": None,
            "weightsCol": None,
            "filters": None
        }, headers={"x-session-id": session_id})
        
        print("No filter rows:", [r["measure"] for r in res.json().get("rows", [])])
        print("advancedId for var0:", [r.get("advancedId") for r in res.json().get("rows", []) if r["measure"] == "Variance (ddof=0)"])

        # 3. Compute descriptive (with filter)
        res = await client.post("/api/descriptive/compute", json={
            "session_id": session_id,
            "column": "A",
            "quantileProbs": [0.25, 0.5, 0.75],
            "trimAlpha": None,
            "winsorLimits": None,
            "weightsCol": None,
            "filters": {"B": ["M"]}
        }, headers={"x-session-id": session_id})
        
        print("With filter summary len:", res.json().get("summary", {}).get("n"))

if __name__ == "__main__":
    asyncio.run(main())
