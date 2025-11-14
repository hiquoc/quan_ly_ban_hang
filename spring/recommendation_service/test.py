import asyncio
from py_eureka_client.eureka_client import EurekaClient  # Correct import

print("Import successful!")

# Quick test (adjust config to your Eureka server)
async def test_eureka():
    client = EurekaClient(
        eureka_server="http://localhost:8761/eureka",  # Your Eureka URL
        app_name="rec-service",  # Service name
        instance_port=8080  # Your app port
    )
    await client.start()  # Register (async)
    print("Client started and registered!")
    await client.stop()  # Deregister

# Run async test
asyncio.run(test_eureka())